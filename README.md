# Tampa Dynamo Fundraiser

A mobile-friendly 31 Day Challenge fundraiser hosted on GitHub Pages and synchronized through Firebase Firestore.

## Included

- `index.html`: team/player selection and team totals
- `player.html`: one independent calendar per player
- `admin.html`: authenticated reservation management
- `css/styles.css`: site styling
- `js/`: Firebase, roster, public site, player calendar, and admin logic
- `firestore.rules`: Firestore security rules

## Deploy to GitHub Pages

1. Upload **all files and folders** in this project to the root of the `tampa-dynamo-fundraiser` repository.
2. Open repository **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)`.
5. Save and wait for the site URL to appear.

## Publish Firestore rules

1. Open Firebase Console → Firestore Database → Rules.
2. Copy the contents of `firestore.rules`.
3. Before publishing, replace `REPLACE_WITH_ADMIN_EMAIL` with the email that will administer the fundraiser.
4. Publish the rules.

## Enable the admin account

1. Firebase Console → Authentication → Get started.
2. Enable **Email/Password** sign-in.
3. Open **Users → Add user**.
4. Create the administrator using the same email placed in `firestore.rules`.
5. Open `/admin.html` on the published site and sign in.

## Data structure

`players/{player-id}/reservations/{day-number}`

Each player has an independent calendar. A transaction prevents the same day from being reserved twice for that player.

## Version 2 admin update

The admin page now displays only the sign-in form until Firebase confirms an authenticated user. After successful sign-in, the dashboard appears and loads each player's reservations directly. This avoids exposing the dashboard layout before authentication and removes the collection-group query dependency.
