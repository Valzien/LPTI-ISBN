<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rules\Enum;

/**
 * Daftar pemohon (semua admin) & manajemen akun pengguna (khusus
 * super_admin) — docs/API.md §3.4, halaman admin §6.
 *
 * Kolom `role` TIDAK pernah mass-assignable: selalu di-set eksplisit di
 * sini setelah validasi enum.
 */
class AdminUserController extends Controller
{
    use ApiResponse;

    /**
     * Daftar pemohon beserta jumlah pengajuannya.
     */
    public function applicants(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ], [
            'q.max' => 'Kata kunci pencarian maksimal 100 karakter.',
        ]);

        $paginator = User::query()
            ->where('role', UserRole::Applicant->value)
            ->withCount('submissions')
            ->when($validated['q'] ?? null, function ($query, string $keyword): void {
                $like = '%'.$keyword.'%';

                $query->where(function ($inner) use ($like): void {
                    $inner->whereRaw('LOWER(name) LIKE LOWER(?)', [$like])
                        ->orWhereRaw('LOWER(email) LIKE LOWER(?)', [$like]);
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return $this->paginatedResponse(
            $paginator->through(fn (User $user) => new UserResource($user)),
        );
    }

    /**
     * Daftar seluruh akun (khusus super_admin).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', new Enum(UserRole::class)],
        ], [
            'q.max' => 'Kata kunci pencarian maksimal 100 karakter.',
            'role.enum' => 'Role tidak valid.',
        ]);

        $paginator = User::query()
            ->withCount('submissions')
            ->when($validated['role'] ?? null, function ($query, string $role): void {
                $query->where('role', $role);
            })
            ->when($validated['q'] ?? null, function ($query, string $keyword): void {
                $like = '%'.$keyword.'%';

                $query->where(function ($inner) use ($like): void {
                    $inner->whereRaw('LOWER(name) LIKE LOWER(?)', [$like])
                        ->orWhereRaw('LOWER(email) LIKE LOWER(?)', [$like]);
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return $this->paginatedResponse(
            $paginator->through(fn (User $user) => new UserResource($user)),
        );
    }

    /**
     * Detail satu akun (khusus super_admin) — dipakai halaman edit.
     */
    public function show(User $user): JsonResponse
    {
        return $this->successResponse(
            new UserResource($user->loadCount('submissions')),
        );
    }

    /**
     * Buat akun baru (khusus super_admin).
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = new User([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'applicant_type' => $validated['applicant_type'] ?? null,
            'publisher_name' => $validated['publisher_name'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        // Role & password di-set eksplisit (role tidak mass-assignable).
        $user->role = UserRole::from($validated['role']);
        $user->password = $validated['password'];
        $user->save();

        AuditLogger::log($request->user(), 'user.created', $user, [
            'role' => $user->role->value,
        ]);

        return $this->createdResponse(new UserResource($user), 'Akun pengguna berhasil dibuat.');
    }

    /**
     * Perbarui akun (khusus super_admin; PUT = penggantian penuh, password
     * opsional bila tidak diubah).
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        if (
            $user->is($request->user())
            && array_key_exists('role', $validated)
            && $validated['role'] !== $user->role->value
        ) {
            return $this->failResponse('Anda tidak dapat mengubah role akun sendiri.', 403);
        }

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'applicant_type' => $validated['applicant_type'] ?? null,
            'publisher_name' => $validated['publisher_name'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        if (! empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        if (array_key_exists('role', $validated)) {
            $user->role = UserRole::from($validated['role']);
        }

        $user->save();

        AuditLogger::log($request->user(), 'user.updated', $user, [
            'fields' => array_keys($validated),
        ]);

        return $this->successResponse(new UserResource($user), 'Akun pengguna berhasil diperbarui.');
    }

    /**
     * Hapus akun (khusus super_admin) — ditolak bila akun sendiri atau masih
     * memiliki pengajuan (data pengajuan tidak boleh ikut terhapus diam-diam).
     */
    public function destroy(Request $request, User $user): JsonResponse|Response
    {
        if ($user->is($request->user())) {
            return $this->failResponse('Anda tidak dapat menghapus akun sendiri.', 403);
        }

        if ($user->submissions()->exists()) {
            return $this->failResponse(
                'Akun masih memiliki pengajuan sehingga tidak dapat dihapus.',
                409,
            );
        }

        if ($user->isSuperAdmin() && User::query()->where('role', UserRole::SuperAdmin->value)->count() <= 1) {
            return $this->failResponse('Minimal harus ada satu akun admin utama.', 409);
        }

        $deletedId = $user->id;
        $deletedName = $user->name;

        $user->tokens()->delete();
        $user->notifications()->delete();
        $user->delete();

        AuditLogger::log($request->user(), 'user.deleted', null, [
            'deleted_user_id' => $deletedId,
            'deleted_user_name' => $deletedName,
        ]);

        return response()->noContent();
    }
}
