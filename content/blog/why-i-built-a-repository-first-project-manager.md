---
title: Why I Built a Repository-First Project Manager
description: Drift started from a simple idea: repositories already contain the shape of a software project.
date: 2026-05-08
updated: 2026-05-08
author: Ava Thalheim
authorTitle: Independent Software Developer
tags:
  - Repository First
  - Solo Developer
  - Architecture
  - Development
draft: false
featured: false
---

# Why I Built a Repository-First Project Manager

Most project management tools start with tasks.

Drift started with a repository.

Repositories already contain an incredible amount of information:

- Code
- Branches
- Pull requests
- Releases
- Contributors
- Commit history

Yet many project management systems treat repositories as external systems.

I wanted to explore the opposite idea.

## The Repository as Source of Truth

What if the repository was the source of truth?

Tasks could create branches.

Branches could create pull requests.

Pull requests could update task status.

Releases could update milestones.

Instead of manually maintaining relationships between everything, the relationships already exist.

That's the direction Drift is moving toward.

## Development Decision

The architectural bet is that project context should be stored and represented close to the repository, not rebuilt in a disconnected SaaS board.
