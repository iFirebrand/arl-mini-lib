import AccountClient from "./AccountClient";

export const metadata = {
  title: "Your account",
  description: "Points, passkeys and how ArLib.me accounts work. No email, no password.",
};

export default function AccountPage() {
  return <AccountClient />;
}
