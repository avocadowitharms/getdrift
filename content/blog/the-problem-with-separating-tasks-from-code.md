---
title: The Problem With Separating Tasks From Code
description: When tasks, code, documentation, and discussions live in separate systems, developers spend too much time rebuilding context.
date: 2026-05-12
updated: 2026-05-12
author: Ava Thalheim
authorTitle: Independent Software Developer
tags:
  - Git
  - GitHub
  - Architecture
  - Repository First
draft: false
featured: false
---

# The Problem With Separating Tasks From Code

Most development teams manage work in one place and code in another.

Tasks live in Jira.

Code lives in GitHub.

Documentation lives somewhere else.

Discussions happen in yet another application.

The result is a fragmented workflow.

Every piece of information exists.

It's just scattered across multiple systems.

## The Questions Developers Need Answered

When a developer starts working on a task, they often need to answer several questions:

- Which repository is involved?
- Which branch should I use?
- Are there related pull requests?
- Has someone worked on this before?

## The Drift Hypothesis

I started thinking about a different approach while working on personal projects.

What if tasks could be directly connected to branches?

What if pull requests automatically updated project status?

Those questions eventually became the foundation for Drift.

## Summary

Separating tasks from code creates coordination work. Repository-first project management tries to remove that work by making code relationships part of the project model.
