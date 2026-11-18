import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { isSupervisor, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { corporateUrl } from "@/lib/storage";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const supabase = await createClient();
  const [{ count }, { data: settings }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("app_settings").select("logo_path, primary_color").single(),
  ]);
  const initials = staff.full_name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const brandStyle = settings?.primary_color && /^#[0-9a-fA-F]{6}$/.test(settings.primary_color)
    ? ({ ["--brand" as string]: settings.primary_color } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex min-h-screen" style={brandStyle}>
      <Sidebar
        name={staff.full_name}
        position={staff.position}
        initials={initials}
        avatarUrl={corporateUrl(staff.avatar_path)}
        unread={count ?? 0}
        supervisor={isSupervisor(staff)}
        logoUrl={corporateUrl(settings?.logo_path)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar unread={count ?? 0} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
