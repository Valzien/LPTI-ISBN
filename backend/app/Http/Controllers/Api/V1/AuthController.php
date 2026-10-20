<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Auth\RegisterRequest;
use App\Http\Requests\Api\V1\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(RegisterRequest $request): JsonResponse
    {
        // Role di-set eksplisit, bukan mass-assignment — permohonan
        // selalu berrole pemohon, tidak pernah dari input klien.
        $user = new User($request->safe()->only([
            'name',
            'email',
            'password',
            'phone',
            'applicant_type',
            'publisher_name',
            'address',
        ]));
        $user->role = UserRole::Applicant;
        $user->save();

        AuditLogger::log($user, 'user.registered', $user);

        return $this->createdResponse([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => new UserResource($user),
        ], 'Registrasi berhasil.');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->safe()->only(['email', 'password']))) {
            return $this->failResponse('Email atau password salah.', 401);
        }

        /** @var User $user */
        $user = Auth::user();

        AuditLogger::log($user, 'user.login', $user);

        return $this->successResponse([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => new UserResource($user),
        ], 'Login berhasil.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        AuditLogger::log($request->user(), 'user.logout');

        return $this->successResponse(message: 'Berhasil logout.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->successResponse(new UserResource($request->user()));
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update($request->safe()->only([
            'name',
            'phone',
            'applicant_type',
            'publisher_name',
            'address',
        ]));

        AuditLogger::log($user, 'user.profile_updated', $user);

        return $this->successResponse(new UserResource($user), 'Profil berhasil diperbarui.');
    }
}
