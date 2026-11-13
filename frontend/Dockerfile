# Builds both apps, then serves them with nginx, which also forwards /api to the gateway.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-ui/package.json packages/shared-ui/
COPY apps/employee-web/package.json apps/employee-web/
COPY apps/hr-web/package.json apps/hr-web/
RUN npm ci
COPY . .
# Links between the two apps; the defaults point at the Vite dev ports.
ARG VITE_EMPLOYEE_APP_URL=http://karyawan.localhost:8080
ARG VITE_HR_APP_URL=http://hr.localhost:8080
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/app.conf /etc/nginx/snippets/app.conf
COPY --from=build /app/apps/employee-web/dist /usr/share/nginx/html/employee
COPY --from=build /app/apps/hr-web/dist /usr/share/nginx/html/hr
