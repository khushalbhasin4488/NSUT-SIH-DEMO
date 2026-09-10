import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { IsArray, IsISO8601, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from './prisma.service';
import { CurrentUser } from './tenant.decorator';
import { AuthUser } from './auth.types';

class CreateTaskDto { @IsString() applicationId!: string; @IsString() officerId!: string; @IsISO8601() scheduledAt!: string; @IsOptional() @IsNumber() latitude?: number; @IsOptional() @IsNumber() longitude?: number; }
class SyncOperationDto { @IsString() operationId!: string; @IsString() taskId!: string; @IsISO8601() deviceUpdatedAt!: string; @IsObject() payload!: Record<string, unknown>; }
class SyncDto { @IsArray() operations!: SyncOperationDto[]; }

@Controller('field')
export class FieldController {
  constructor(private readonly prisma: PrismaService) {}
  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto) { return this.prisma.fieldTask.create({ data: { applicationId: dto.applicationId, officerId: dto.officerId, scheduledAt: new Date(dto.scheduledAt), latitude: dto.latitude, longitude: dto.longitude } }); }
  @Get('tasks/:officerId')
  async listTasks(@Param('officerId') officerId: string, @CurrentUser() user: AuthUser) {
    if (!user.roles.some((role) => ['STATE_ADMIN', 'CENTRAL_ADMIN'].includes(role))) {
      const officer = user.email ? await this.prisma.stakeholder.findFirst({ where: { email: user.email } }) : null;
      if (officer?.id !== officerId) throw new ForbiddenException('You may only view your own assigned tasks');
    }
    return this.prisma.fieldTask.findMany({ where: { officerId }, include: { application: { include: { instrument: true, applicant: true } } }, orderBy: { scheduledAt: 'asc' } });
  }
  @Post('sync')
  async sync(@Body() dto: SyncDto) {
    const results: Record<string, unknown>[] = [];
    for (const operation of dto.operations) {
      const existing = await this.prisma.syncOperation.findUnique({ where: { operationId: operation.operationId } });
      if (existing) { results.push({ operationId: operation.operationId, status: existing.status, replay: true }); continue; }
      const task = await this.prisma.fieldTask.findUniqueOrThrow({ where: { id: operation.taskId } });
      const deviceDate = new Date(operation.deviceUpdatedAt);
      if (deviceDate < task.updatedAt) {
        const conflict = await this.prisma.syncOperation.create({ data: { operationId: operation.operationId, taskId: operation.taskId, deviceUpdatedAt: deviceDate, payload: operation.payload as any, status: 'CONFLICT', conflictNote: 'Server version is newer; server state retained' } });
        results.push({ operationId: operation.operationId, status: conflict.status, conflictNote: conflict.conflictNote });
        continue;
      }
      const status = typeof operation.payload.status === 'string' ? operation.payload.status : undefined;
      const updated = await this.prisma.$transaction(async tx => {
        await tx.fieldTask.update({ where: { id: operation.taskId }, data: { status: status as any, version: { increment: 1 } } });
        return tx.syncOperation.create({ data: { operationId: operation.operationId, taskId: operation.taskId, deviceUpdatedAt: deviceDate, payload: operation.payload as any, status: 'APPLIED' } });
      });
      results.push({ operationId: operation.operationId, status: updated.status });
    }
    return { applied: results.filter(r => r.status === 'APPLIED').length, conflicts: results.filter(r => r.status === 'CONFLICT').length, results };
  }
}
