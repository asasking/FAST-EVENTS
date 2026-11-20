# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Theming

Shared color palettes live in `src/theme/colors.ts`; spacing, radius, and type-size tokens live in `src/theme/tokens.ts`. The root layout provides the theme context, which defaults to light mode.

Use `useTheme` from `@/hooks/use-theme` to access the current `mode`, semantic `colors`, `isDark`, and `toggleTheme`. The reusable `ThemeToggle` component provides an accessible light/dark switch and can be placed in a future screen or settings panel. Theme selection currently lasts for the active app session.

## Welcome and navigation

The first-launch welcome screen lives at `src/app/index.tsx`, outside the tab group. Continuing marks onboarding complete in SecureStore on native and browser storage on web, then opens `/signup`. A returning authenticated user goes to `/home`; a visitor who has not signed in goes to `/signup`. Tab screens belong in `src/app/(tabs)/`; add each as a sibling route and register its label and icon in `(tabs)/_layout.tsx`. The Home route is currently a placeholder until the main event-discovery screen is built.

## Phone authentication

The login and signup routes are `src/app/login.tsx` and `src/app/signup.tsx`. Signup sends a username, E.164 phone number, ISO country code, and three-letter currency code to Django. The account is created only after the SMS code is verified. Login also requires a one-time code.

The backend routes are:

- `POST /api/auth/signup/request-code/`
- `POST /api/auth/signup/verify-code/`
- `POST /api/auth/login/request-code/`
- `POST /api/auth/login/verify-code/`
- `POST /api/auth/token/refresh/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/` (JWT required)

Codes are six digits, expire after 10 minutes, and are stored as keyed one-way digests rather than recoverable text. Signup codes allow five failed checks. Login codes are invalidated after an incorrect check, then another code can be requested after five minutes. Resends have a one-minute cooldown and each phone number is capped at five SMS attempts per hour. SMS delivery attempts are recorded without storing message bodies or OTP values. Requests are also rate-limited by IP; production deployments with multiple workers should use a shared Django cache such as Redis.

The custom Django user uses phone number as `USERNAME_FIELD`, retains a username, and has no usable password for OTP-created accounts. Country is stored as a `django-countries` `CountryField`; currency is stored as an uppercase three-letter code. The bundled signup picker still uses `countries-list` metadata, so its currency suggestions are not payment-support guarantees.

JWT access tokens last five minutes; refresh tokens last one day, rotate on refresh, and are blacklisted at logout. Native clients store the session with Expo SecureStore. Web builds keep tokens in memory only; use an HttpOnly-cookie design before treating a browser deployment as a persistent secure session.

### Local configuration

Install backend requirements and apply migrations from the repository root:

```powershell
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Set `DJANGO_SECRET_KEY`, `BEEM_API`, and `BEEM_SECRET` as environment variables before starting Django. `BEEM_SENDER_ID` defaults to `AC-INSIGHTS`. Django does not read `.env` files automatically. Keep real credentials out of source control. Add the Django host and Expo web origin to `DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` when they differ from the local defaults.

Set `EXPO_PUBLIC_API_URL` in `fast-events-app/.env.local`, including the `/api` prefix. For web or an iOS simulator, a typical local value is `http://127.0.0.1:8000/api`; for the Android emulator use `http://10.0.2.2:8000/api`. A physical phone needs the development computer's LAN address, with that host allowed by Django and reachable on the network. The app shows a configuration/network error instead of pretending an SMS was sent when it cannot reach the API.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
