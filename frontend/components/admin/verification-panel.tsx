"use client";

import { useActionState } from "react";

import {
  approveAction,
  recordIsbnAction,
  rejectAction,
  requestRevisionAction,
  startReviewAction,
  type AdminFormState,
} from "@/lib/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SubmissionStatus } from "@/lib/types";

const kosong: AdminFormState = { ok: false, message: "" };

/** Pesan error per field dari state form (bila ada). */
function pesanField(state: AdminFormState, field: string): string | null {
  const values = state.fieldErrors?.[field];

  return Array.isArray(values) && values.length > 0 ? (values[0] as string) : null;
}

/** Tampilkan pesan kegagalan aksi (backend / validasi client). */
function PesanGagal({ state }: { state: AdminFormState }) {
  if (state.ok || !state.message) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

/** Kotak info untuk status yang tidak memiliki aksi admin. */
function InfoStatus({ judul, teks }: { judul: string; teks: string }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-3 text-muted-foreground text-sm">
      <strong className="font-medium text-foreground">{judul}</strong> — {teks}
    </div>
  );
}

interface VerificationPanelProps {
  submissionId: number;
  status: SubmissionStatus;
}

/**
 * Panel aksi verifikasi admin pada detail pengajuan (Tahap 6).
 *
 * Aksi ditampilkan sesuai status; seluruh transisi divalidasi ulang oleh
 * backend (peta transisi tunggal + role check). Hook dipanggil tanpa syarat
 * (rules-of-hooks) lalu form dipilih dari status.
 */
export function VerificationPanel({
  submissionId,
  status,
}: VerificationPanelProps) {
  const [stMulai, actMulai, pendMulai] = useActionState(
    startReviewAction,
    kosong,
  );
  const [stRevisi, actRevisi, pendRevisi] = useActionState(
    requestRevisionAction,
    kosong,
  );
  const [stSetuju, actSetuju, pendSetuju] = useActionState(
    approveAction,
    kosong,
  );
  const [stTolak, actTolak, pendTolak] = useActionState(rejectAction, kosong);
  const [stIsbn, actIsbn, pendIsbn] = useActionState(recordIsbnAction, kosong);

  if (status === "submitted" || status === "resubmitted") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mulai Verifikasi</CardTitle>
          <CardDescription>
            Periksa data buku dan dokumen pengajuan ini, lalu tentukan
            langkah: minta revisi, setujui, atau tolak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PesanGagal state={stMulai} />
          <form action={actMulai}>
            <input type="hidden" name="id" value={submissionId} />
            <Button type="submit" disabled={pendMulai}>
              {pendMulai ? "Mengirim..." : "Mulai Verifikasi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (status === "under_review") {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Minta Revisi</CardTitle>
            <CardDescription>
              Kembalikan pengajuan ke pemohon. Catatan wajib diisi — inilah
              satu-satunya panduan pemohon memperbaiki pengajuan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PesanGagal state={stRevisi} />
            <form action={actRevisi} className="space-y-3">
              <input type="hidden" name="id" value={submissionId} />
              <div className="space-y-1">
                <Label htmlFor="note">Catatan Revisi</Label>
                <Textarea
                  id="note"
                  name="note"
                  rows={3}
                  placeholder="Contoh: Sinopsis perlu dilengkapi dan halaman sampul wajib diganti."
                  aria-invalid={pesanField(stRevisi, "note") ? true : undefined}
                />
                {pesanField(stRevisi, "note") ? (
                  <p className="text-destructive text-xs">
                    {pesanField(stRevisi, "note")}
                  </p>
                ) : null}
              </div>
              <Button type="submit" variant="outline" disabled={pendRevisi}>
                {pendRevisi ? "Mengirim..." : "Kirim Permintaan Revisi"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Persetujuan</CardTitle>
            <CardDescription>
              Menyetujui berarti pengajuan diteruskan untuk diproses —{" "}
              <strong className="font-medium text-foreground">
                ini bukan berarti nomor ISBN resmi sudah terbit
              </strong>
              . Nomor ISBN hanya dicatat setelah sah ditetapkan pihak
              berwenang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PesanGagal state={stSetuju} />
            <form action={actSetuju}>
              <input type="hidden" name="id" value={submissionId} />
              <Button type="submit" disabled={pendSetuju}>
                {pendSetuju ? "Mengirim..." : "Setujui untuk Diproses"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tolak Pengajuan</CardTitle>
            <CardDescription>
              Menolak mengakhiri pengajuan. Alasan wajib diisi — tersimpan di
              histori status dan dilihat pemohon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PesanGagal state={stTolak} />
            <form action={actTolak} className="space-y-3">
              <input type="hidden" name="id" value={submissionId} />
              <div className="space-y-1">
                <Label htmlFor="reason">Alasan Penolakan</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  rows={3}
                  placeholder="Contoh: Naskah tidak memenuhi kriteria keaslian yang dipersyaratkan."
                  aria-invalid={
                    pesanField(stTolak, "reason") ? true : undefined
                  }
                />
                {pesanField(stTolak, "reason") ? (
                  <p className="text-destructive text-xs">
                    {pesanField(stTolak, "reason")}
                  </p>
                ) : null}
              </div>
              <Button
                type="submit"
                variant="destructive"
                disabled={pendTolak}
              >
                {pendTolak ? "Mengirim..." : "Tolak Pengajuan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "approved_for_processing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catat Nomor ISBN</CardTitle>
          <CardDescription>
            Pengajuan sudah disetujui untuk diproses. Catat di sini{" "}
            <strong className="font-medium text-foreground">
              hanya nomor ISBN yang sudah sah ditetapkan
            </strong>{" "}
            oleh pihak berwenang — sistem tidak pernah menghasilkan nomor
            ISBN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PesanGagal state={stIsbn} />
          <form action={actIsbn} className="space-y-3">
            <input type="hidden" name="id" value={submissionId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="isbn_number">Nomor ISBN</Label>
                <Input
                  id="isbn_number"
                  name="isbn_number"
                  placeholder="978-602-1234-56-7"
                  aria-invalid={
                    pesanField(stIsbn, "isbn_number") ? true : undefined
                  }
                />
                {pesanField(stIsbn, "isbn_number") ? (
                  <p className="text-destructive text-xs">
                    {pesanField(stIsbn, "isbn_number")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="isbn_assigned_at">Tanggal Penetapan</Label>
                <Input
                  id="isbn_assigned_at"
                  name="isbn_assigned_at"
                  type="date"
                  aria-invalid={
                    pesanField(stIsbn, "isbn_assigned_at") ? true : undefined
                  }
                />
                {pesanField(stIsbn, "isbn_assigned_at") ? (
                  <p className="text-destructive text-xs">
                    {pesanField(stIsbn, "isbn_assigned_at")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="isbn_source_note">
                Sumber / Keterangan Penerbitan
              </Label>
              <Textarea
                id="isbn_source_note"
                name="isbn_source_note"
                rows={2}
                placeholder="Contoh: Surat penetapan penerbit bernomor 001/2026."
                aria-invalid={
                  pesanField(stIsbn, "isbn_source_note") ? true : undefined
                }
              />
              {pesanField(stIsbn, "isbn_source_note") ? (
                <p className="text-destructive text-xs">
                  {pesanField(stIsbn, "isbn_source_note")}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={pendIsbn}>
              {pendIsbn ? "Menyimpan..." : "Catat Nomor ISBN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (status === "draft") {
    return (
      <InfoStatus
        judul="Masih Draft"
        teks="menunggu pemohon melengkapi data dan dokumen lalu mengajukan ke verifikasi."
      />
    );
  }

  if (status === "needs_revision") {
    return (
      <InfoStatus
        judul="Menunggu Revisi Pemohon"
        teks="catatan revisi sudah dikirim; verifikasi dilanjutkan setelah pemohon mengajukan ulang."
      />
    );
  }

  if (status === "isbn_assigned") {
    return (
      <InfoStatus
        judul="Alur Selesai"
        teks="nomor ISBN sudah tercatat pada pengajuan ini."
      />
    );
  }

  return (
    <InfoStatus
      judul="Pengajuan Ditolak"
      teks="alasan penolakan tersimpan di histori status; tidak ada aksi verifikasi lanjutan."
    />
  );
}
