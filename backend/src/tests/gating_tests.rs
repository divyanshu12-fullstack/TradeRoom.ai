#[test]
fn execute_allowed_when_cro_approved() {
    assert!(crate::reducers::execution::can_execute(true, "", ""));
}

#[test]
fn execute_blocked_without_override() {
    assert!(!crate::reducers::execution::can_execute(false, "", ""));
}

#[test]
fn execute_allowed_with_override() {
    assert!(crate::reducers::execution::can_execute(false, "risk_lead", "manual override"));
}
