use spacetimedb::{table, ScheduleAt};

use crate::procedures::cro::cro_think;
use crate::procedures::pattern::pattern_extractor_think;
use crate::procedures::pm::portfolio_manager_think;
use crate::procedures::quant::quant_think;

#[table(accessor = pattern_schedule, scheduled(pattern_extractor_think))]
pub struct PatternSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

#[table(accessor = quant_schedule, scheduled(quant_think))]
pub struct QuantSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

#[table(accessor = pm_schedule, scheduled(portfolio_manager_think))]
pub struct PmSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

#[table(accessor = cro_schedule, scheduled(cro_think))]
pub struct CroSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}
