# WeatherWise: System Development & Agent Guidelines

## 1. Project Overview & Proposal Summary
- **Project Name**: WeatherWise : Real-Time Weather Monitoring and Forecasting
- **Platform**: Responsive Web Application (Mobile, Tablet, Desktop)
- **Author**: Miguel Fernando Duyag (LFCA411N120, IPT2)
- **Core Purpose**: Provide users with a streamlined, responsive interface to search locations, monitor real-time weather conditions, view rain and upcoming forecasts, and persist user preferences/saved locations.

### Functional Modules
1. **Weather Search (Location Search)**: Search bar with autocomplete/location lookup to select cities before displaying conditions.
2. **Current Weather Display**: Real-time temperature, condition badge/icon, humidity, and wind speed.
3. **Forecast Module**: Rain forecast probability/precipitation details and multi-day upcoming weather forecast.
4. **API Integration**: Integration with OpenWeather API (current weather, 5-day/3-hour forecast, geocoding) with server-side caching and rate-limiting.
5. **Responsive Interface**: Mobile-first design adapting seamlessly across phones, tablets, and desktop displays.
6. **User Preferences & Database Storage**: MySQL database to store saved locations, recent search history, and user settings (e.g. units: Metric °C vs Imperial °F).
7. **Administration / System Settings**: Basic system configuration and settings management.

---

## 2. Technology Stack
- **Frontend**: React 18+, Vite, React Router 6+, Tailwind CSS
- **Backend / API**: Node.js, Express.js
- **Database**: MySQL (using connection pooling via `mysql2`)
- **External API**: OpenWeather API (One Call / Current & Forecast / Geocoding APIs)
- **Deployment / Hosting**: Render (Web Service for Node.js API, Static Site for Vite frontend, Render MySQL/PostgreSQL support via Render MCP)
- **Testing**: Vitest for frontend components and backend unit/integration tests
- **Version Control**: Git / GitHub

---

## 3. Installed Plugins & Skills (from Agentic Awesome Skills)

The workspace has been equipped with the following bundles and skills from [Agentic Awesome Skills (AAS)](https://github.com/sickn33/agentic-awesome-skills):

### Installed Plugins (`agy plugin list` / `.agents/plugins/`)
1. **`agentic-bundle-web-app`**: Comprehensive frontend & web application stack (React, Vite, Tailwind, UI states, UI accessibility, responsive design).
2. **`agentic-bundle-aas-api-platform-builder`**: Express/Node.js API patterns, endpoint scaffolding, rate limit protection, error handling, database design.
3. **`agentic-bundle-aas-qa-test-automation`**: QA testing automation, systematic debugging, test-driven development, and component testing.

### Project-Specific Skills (`.agents/skills/`)
- [`weather-observation-fetching`](.agents/skills/weather-observation-fetching/SKILL.md): Best practices for weather observation data normalization, meteorological units, quality checks, and timestamp handling.
- [`api-integration-architect`](.agents/skills/api-integration-architect/SKILL.md): Architecture for third-party API integration, OpenWeather API client abstraction, rate limiting, and response caching.
- [`api-endpoint-builder`](.agents/skills/api-endpoint-builder/SKILL.md): Express REST endpoint creation, input validation, and structured responses.
- [`nodejs-backend-patterns`](.agents/skills/nodejs-backend-patterns/SKILL.md): Scalable Express backend architecture, controller-service patterns, and middleware.
- [`react-best-practices`](.agents/skills/react-best-practices/SKILL.md): Vercel-curated performance optimization for React components, state management, and data fetching.
- [`frontend-developer`](.agents/skills/frontend-developer/SKILL.md): Modern React UI development, responsive layouts, and client state.
- [`tailwind-patterns`](.agents/skills/tailwind-patterns/SKILL.md): Tailwind CSS styling, responsive breakpoints, and weather-themed UI components.
- [`mysql`](.agents/skills/mysql/SKILL.md): MySQL configuration, schema management, indexing, and connection pooling.
- [`database-migrations-sql-migrations`](.agents/skills/database-migrations-sql-migrations/SKILL.md): SQL migrations for user preferences, saved locations, and search history tables.
- [`vitest-skill`](.agents/skills/vitest-skill/SKILL.md): Vite-native testing with Vitest for components and services.
- [`render-automation`](.agents/skills/render-automation/SKILL.md) & [`appdeploy`](.agents/skills/appdeploy/SKILL.md): Render hosting configuration, environment secrets management, and automated deployments.
- [`systematic-debugging`](.agents/skills/systematic-debugging/SKILL.md): Root-cause debugging workflow for API response issues, CORS errors, or rendering glitches.

---

## 4. Architectural Rules
1. **Separation of Concerns**: Keep frontend (`/client` or `/frontend`) and backend (`/server` or `/backend`) decoupled.
2. **Secure API Keys**: Never expose the OpenWeather API key on the frontend; all external weather API requests must be proxied through the Express backend.
3. **Resilience & Caching**: Implement in-memory or Redis/database caching for weather query results to avoid exceeding OpenWeather rate limits.
4. **Responsive First**: All UI components must be fully usable on mobile screens (375px+), tablets, and desktops.
