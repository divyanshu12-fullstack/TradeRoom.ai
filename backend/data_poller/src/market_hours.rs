use chrono::{Datelike, Local, Timelike, Weekday};

/// Check if US stock market is open.
/// NYSE/NASDAQ regular hours: Monday-Friday, 9:30 AM - 4:00 PM ET.
/// Pre-market: 4:00 AM - 9:30 AM ET.
/// After-hours: 4:00 PM - 8:00 PM ET.
pub fn is_market_open() -> bool {
    let now = Local::now();
    let hour = now.hour() as i32;
    let minute = now.minute() as i32;
    let weekday = now.weekday();

    // Skip weekends
    if weekday == Weekday::Sat || weekday == Weekday::Sun {
        return false;
    }

    // Regular market hours: 9:30 AM - 4:00 PM (in local time, assuming ET)
    // Assuming we're running in ET timezone; adjust offset if needed
    let current_minutes = hour * 60 + minute as i32;
    let market_open = 9 * 60 + 30; // 9:30 AM
    let market_close = 16 * 60; // 4:00 PM

    current_minutes >= market_open && current_minutes < market_close
}

/// Check if market is in pre-trading (4 AM - 9:30 AM ET).
pub fn is_premarket() -> bool {
    let now = Local::now();
    let hour = now.hour() as i32;
    let minute = now.minute() as i32;
    let weekday = now.weekday();

    if weekday == Weekday::Sat || weekday == Weekday::Sun {
        return false;
    }

    let current_minutes = hour * 60 + minute as i32;
    let premarket_open = 4 * 60; // 4:00 AM
    let premarket_close = 9 * 60 + 30; // 9:30 AM

    current_minutes >= premarket_open && current_minutes < premarket_close
}

/// Check if market is in post-trading (4 PM - 8 PM ET).
pub fn is_afterhours() -> bool {
    let now = Local::now();
    let hour = now.hour() as i32;
    let minute = now.minute() as i32;
    let weekday = now.weekday();

    if weekday == Weekday::Sat || weekday == Weekday::Sun {
        return false;
    }

    let current_minutes = hour * 60 + minute as i32;
    let afterhours_open = 16 * 60; // 4:00 PM
    let afterhours_close = 20 * 60; // 8:00 PM

    current_minutes >= afterhours_open && current_minutes < afterhours_close
}

/// Check if market is open (regular or extended hours).
pub fn is_market_open_extended() -> bool {
    is_premarket() || is_market_open() || is_afterhours()
}
