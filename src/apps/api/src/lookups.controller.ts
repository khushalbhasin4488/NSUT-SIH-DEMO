import { Controller, Get } from '@nestjs/common';
import { Public } from './public.decorator';
import { INSTRUMENT_CATEGORIES } from './instrument-categories';

@Controller('lookups')
@Public()
export class LookupsController {
  @Get('instrument-categories') categories() { return INSTRUMENT_CATEGORIES; }
  @Get('application-statuses') statuses() { return ['DRAFT','SUBMITTED','UNDER_REVIEW','SCHEDULED','VERIFICATION_PASSED','VERIFICATION_FAILED','CERTIFICATE_ISSUED','REJECTED']; }
  @Get('states') states() { return [{ code: 'DL', name: 'Delhi' }, { code: 'MH', name: 'Maharashtra' }, { code: 'KA', name: 'Karnataka' }, { code: 'TN', name: 'Tamil Nadu' }]; }
}
