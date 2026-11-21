.PHONY: help build lint fmt api web landing typecheck

help:
	@echo "Targets:"
	@echo "  build      - cargo build --workspace"
	@echo "  lint       - cargo clippy --workspace --all-targets -- -D warnings"
	@echo "  fmt        - cargo fmt --all"
	@echo "  api        - run the API on :18080"
	@echo "  web        - Next dev server for the product app (:3000/app)"
	@echo "  landing    - Next dev server for the marketing site (:3001)"
	@echo "  typecheck  - tsc --noEmit for both apps"

build:
	cargo build --workspace

lint:
	cargo fmt --all -- --check
	cargo clippy --workspace --all-targets -- -D warnings

fmt:
	cargo fmt --all

api:
	cargo run -p api

web:
	npm run dev:web

landing:
	npm run dev:landing

typecheck:
	npm run typecheck
