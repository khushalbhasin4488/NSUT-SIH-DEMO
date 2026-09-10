import { Injectable } from '@nestjs/common';

export type ScheduleVisit = { id: string; latitude: number; longitude: number; priority?: number; durationMinutes?: number };

@Injectable()
export class ScheduleService {
  optimize(visits: ScheduleVisit[], start: { latitude: number; longitude: number }, capacityMinutes = 480) {
    const pending = [...visits]; const route: ScheduleVisit[] = []; let current = start; let minutes = 0;
    while (pending.length) {
      pending.sort((a, b) => this.distance(current, a) - this.distance(current, b) || (b.priority ?? 0) - (a.priority ?? 0));
      const next = pending[0]; const nextMinutes = minutes + (next.durationMinutes ?? 60) + 30;
      if (nextMinutes > capacityMinutes) break;
      route.push(next); pending.shift(); current = next; minutes = nextMinutes;
    }
    return { route, unscheduled: pending, totalMinutes: minutes, utilization: Math.round((minutes / capacityMinutes) * 100) };
  }
  private distance(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) { return Math.hypot(a.latitude - b.latitude, a.longitude - b.longitude); }
}
