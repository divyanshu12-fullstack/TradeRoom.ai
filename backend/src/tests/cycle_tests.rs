#[test]
fn continues_before_third_pass() {
    assert!(crate::procedures::cycle::should_continue_cycles(1));
    assert!(crate::procedures::cycle::should_continue_cycles(2));
}

#[test]
fn stops_after_third_pass() {
    assert!(!crate::procedures::cycle::should_continue_cycles(3));
    assert!(!crate::procedures::cycle::should_continue_cycles(4));
}
