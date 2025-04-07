# InsightsUBC

**InsightsUBC** is a full-stack application developed as part of UBC’s CPSC 310 course. It enables users to query and analyze academic data from UBC’s publicly available datasets, helping students explore grade trends and make more informed course decisions.

The backend is written entirely from scratch in TypeScript and the frontend was built using React.

---

## Demo and Documentation

- **Video Demo:** https://youtu.be/6v1DGQZnZXc  

---

## Features

- Query courses by instructor, department, average grade, year, and more
- Complex filter support using AND, OR, GT, LT, EQ, GROUP, and ORDER
- Displays results in a responsive React-based UI
- Parses and transforms dataset files in-memory with no database
- Returns filtered and formatted results dynamically
- Includes robust unit test coverage and CI setup

---

## Technical Highlights

### Backend (TypeScript)
- Built from scratch without using Express or any web frameworks
- Implements a full query language evaluator and transformer
- Performs file I/O using the Node.js `fs` module
- Modular structure for controller, model, and router logic
- Fully typed with interface-driven design

### Frontend (React)
- Built with React and plain JavaScript
- Modular components for query input, results display, and filters
- Dynamically interacts with backend query engine via fetch

### Testing and CI
- Test-driven development using Mocha and Chai
- Over 90% test coverage
- GitHub Actions for linting and testing on every commit

---

## Stack

- **Frontend:** React, JavaScript, HTML, CSS
- **Backend:** TypeScript (custom-built server, no frameworks)
- **Tooling:** Node.js, Webpack, ESLint, Mocha, Chai

---
### License

While the readings for this course are licensed using [CC-by-SA](https://creativecommons.org/licenses/by-sa/3.0/), **checkpoint descriptions and implementations are considered private materials**. Please do not post or share your project solutions. We go to considerable lengths to make the project an interesting and useful learning experience for this course. This is a great deal of work, and while future students may be tempted by your solutions, posting them does not do them any real favours. Please be considerate with these private materials and not pass them along to others, make your repos public, or post them to other sites online.
