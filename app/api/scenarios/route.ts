import { NextResponse } from "next/server";
import { simulateScenario } from "@/lib/finance/workspace";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { ScenarioInputSchema } from "@/lib/server/schemas";

export async function POST(request: Request) {
  try {
    // 鉴权后再计算，避免将内测能力暴露为公共接口。
    await getRepository();
    const parsed = ScenarioInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "情景参数校验失败" }, { status: 400 });
    }
    return NextResponse.json({ result: simulateScenario(parsed.data) });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "情景推演失败" }, { status: 500 });
  }
}
