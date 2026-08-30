fn main() {
    // A release can contain documentation-only source changes. Make the
    // requested image identity an explicit Cargo input so a shared target
    // cache cannot keep the previous commit in the server binary.
    println!("cargo:rerun-if-env-changed=BUILD_SHA");
    println!(
        "cargo:rustc-env=BUILD_SHA={}",
        std::env::var("BUILD_SHA").unwrap_or_else(|_| "dev".into())
    );
}
