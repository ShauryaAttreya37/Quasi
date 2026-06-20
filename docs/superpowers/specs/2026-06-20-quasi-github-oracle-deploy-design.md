# Quasi GitHub Remote and Oracle VM Deploy Design

## Goal

Publish the existing local Quasi Discord bot as a private GitHub repository and document production-ready deployment commands for an Oracle Cloud Ubuntu VM.

## Repository

The existing `C:\Discord Bots\Quasi` working tree remains the source of truth. The GitHub repository is private, named `Quasi`, and configured as the `origin` remote. The current `master` branch is pushed to GitHub after committing the local project files.

## Deployment

Deployment uses a standard Ubuntu VM flow: install Git, Node.js 20, and `pm2`; clone the private repo; install production dependencies with `npm ci --omit=dev`; create `.env` from `.env.example`; run syntax checks and tests; start the bot under `pm2`; save the process list and enable systemd startup.

## Secrets

Runtime secrets stay out of Git. `.env` remains ignored, while `.env.example` documents the required and optional configuration keys without real credentials.

## Operations

The deployment documentation includes commands for first deployment, updates, restarts, logs, and `pm2` status checks. Updates use `git pull --ff-only` to avoid accidental merge commits on the VM.

## Verification

Before pushing, run Node syntax checks and tests. After pushing, verify that `origin` points to the private GitHub repository and that the branch is pushed successfully.
