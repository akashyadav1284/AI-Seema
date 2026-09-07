# Development Guide

## Setup Development Environment

### Backend
1. **Python version**: Python 3.11 or higher is recommended.
2. **Virtual Environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables**:
   Copy `.env.example` to `.env` and adjust the values.

5. **Run the Server**:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend
1. **Node version**: Node.js 18 or higher is recommended.
2. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```
3. **Environment Variables**:
   Copy `.env.example` to `.env` and adjust `VITE_API_BASE_URL` if needed.

4. **Run the Dev Server**:
   ```bash
   npm run dev
   ```

### Database
Ensure a local instance of MongoDB is running on `localhost:27017` or use Docker.

## Git Workflow
- Phase 1 work should be committed to `feature/project-foundation`.
- Future features should follow the naming convention `feature/<feature-name>`.

## Testing
Run backend tests using `pytest` inside the `backend` directory.
