import { getRequestUser } from "../../security";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return Response.json(
        {
          status: "unregistered",
          message:
            "Email belum terdaftar sebagai staf atau sesi masuk belum tersedia.",
        },
        { status: 401 },
      );
    }
    return Response.json({
      status: user.active ? "active" : "inactive",
      user: {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Status akses belum dapat diperiksa.",
      },
      { status: 500 },
    );
  }
}
