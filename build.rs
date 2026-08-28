fn main() {
    println!(
        "cargo:rustc-env=BUILD_SHA={}",
        std::env::var("BUILD_SHA").unwrap_or_else(|_| "dev".into())
    );
}
