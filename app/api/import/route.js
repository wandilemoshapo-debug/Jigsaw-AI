import { importLeads } from '@/lib/import/index.cjs';

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    let content = '';
    let type = 'csv';
    let filename = 'file';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      
      if (!file) {
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }

      return Response.json({ 
        error: 'Excel parsing coming soon. Please use CSV format for now.' 
      }, { status: 400 });
    }

    const body = await req.json();
    content = body.content;
    type = body.type || 'csv';
    filename = body.filename || 'file';

    if (!content) {
      return Response.json({ error: 'No content provided' }, { status: 400 });
    }

    const result = await importLeads(content, { type, filename });

    return Response.json(result);
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}