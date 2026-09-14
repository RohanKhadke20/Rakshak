# Contributing to Project RAKSHAK

Thank you for your interest in contributing to Project RAKSHAK! We welcome pull requests, bug reports, and suggestions to make our security operations center more robust.

---

## 🛠️ Development Workflow

1. **Fork the Repository**:
   Fork the repository to your own GitHub account and clone it locally:
   ```bash
   git clone https://github.com/<your-username>/Rakshak.git
   cd Rakshak
   ```

2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

3. **Install Dependencies**:
   ```bash
   npm run install:all # or npm install in root, backend, and frontend
   ```

4. **Launch Local Database**:
   ```bash
   docker compose up -d
   ```

5. **Run Migrations & Seed**:
   ```bash
   npm run prisma:migrate -w backend
   npm run prisma:seed -w backend
   ```

6. **Run Linter & Build Verification**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 📝 Commit Message Guidelines

We adhere to the Conventional Commits specification:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation updates
- `refactor:` for code restructurings
- `perf:` for performance optimizations
- `test:` for test additions or improvements

---

## 📬 Submitting a Pull Request

- Ensure all TypeScript checks and builds pass before submitting.
- Provide a clear, descriptive title and summary of changes.
- Reference any open issue numbers (e.g. `Closes #12`).
