import { AlignmentType, Document, Footer, Packer, Paragraph, TextRun } from 'docx';
import { NextResponse } from 'next/server';
import { createClient, getProfile } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: RouteContext<'/api/drafts/[id]/docx'>) {
  const { id } = await params;
  if (!(await getProfile())) return NextResponse.json({ error: 'Bejelentkezés szükséges.' }, { status: 401 });

  const supabase = await createClient();
  const { data: draft } = await supabase.from('drafts').select('title, content, version').eq('id', id).maybeSingle();
  if (!draft) return NextResponse.json({ error: 'A tervezet nem található.' }, { status: 404 });

  const doc = new Document({
    title: draft.title,
    description: "Demo project built for Verdictum's proposal – sample data only",
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Demo project built for Verdictum's proposal – sample data only",
                    size: 16,
                    color: '888888',
                  }),
                ],
              }),
            ],
          }),
        },
        children: draft.content
          .split('\n')
          .map((line: string) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun(line)] })),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `${draft.title}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="tervezet-v${draft.version}.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
