import { SessionTokenGuard } from "@/components/SessionTokenGuard";

export default function TransferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionTokenGuard>{children}</SessionTokenGuard>;
}
