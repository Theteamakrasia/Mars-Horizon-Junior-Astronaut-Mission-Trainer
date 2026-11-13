.PHONY: help install dev check test build preview balance docker-up docker-down docker-logs

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "} {printf "%-14s %s\n", $$1, $$2}'

install: ## Install locked npm dependencies
	npm ci

dev: ## Start the Vite development server
	npm run dev

check: ## Run import, markup, and TypeScript checks
	npm run check

test: ## Run the unit test suite
	npm test

build: ## Build the static production bundle
	npm run build

preview: ## Serve the production bundle locally
	npm run preview -- --host 0.0.0.0

balance: ## Check simulation balance
	npm run balance

docker-up: ## Build and run the local container
	docker compose up --build

docker-down: ## Stop and remove the local container
	docker compose down

docker-logs: ## Follow local container logs
	docker compose logs --follow
