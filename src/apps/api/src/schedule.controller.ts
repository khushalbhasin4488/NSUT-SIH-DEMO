import { Body, Controller, Post } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ScheduleService, ScheduleVisit } from './schedule.service';
import { Roles } from './roles.decorator';

class VisitDto implements ScheduleVisit { @IsString() id!: string; @IsNumber() latitude!: number; @IsNumber() longitude!: number; @IsOptional() @IsNumber() priority?: number; @IsOptional() @IsNumber() @Min(1) durationMinutes?: number; }
class OptimizeDto { visits!: VisitDto[]; start!: { latitude: number; longitude: number }; @IsOptional() @IsNumber() @Min(1) capacityMinutes?: number; }
@Controller('schedule')
export class ScheduleController { constructor(private readonly scheduler: ScheduleService) {} @Post('optimize') @Roles('STATE_ADMIN', 'CENTRAL_ADMIN') optimize(@Body() dto: OptimizeDto) { return this.scheduler.optimize(dto.visits, dto.start, dto.capacityMinutes); } }
