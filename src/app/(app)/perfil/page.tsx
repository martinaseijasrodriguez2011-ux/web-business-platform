import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { requireStaff } from "@/lib/auth";
import { ProfileView } from "../equipo/profile-view";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const me = await requireStaff();
  return (
    <div className="space-y-6">
      <ProfileView staff={me} showLimit />
      <Card>
        <CardHeader title="Mis datos" subtitle="El nombre, el cargo y el rol los gestiona Dirección. Puede actualizar su teléfono y su fotografía." />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo de acceso" htmlFor="email"><Input id="email" value={me.email ?? "—"} disabled readOnly /></Field>
          </div>
          <ProfileForm phone={me.phone} avatarPath={me.avatar_path} staffId={me.id} />
        </CardBody>
      </Card>
    </div>
  );
}
