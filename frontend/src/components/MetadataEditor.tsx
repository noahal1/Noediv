import { useState } from 'react';
import axios from 'axios';

interface MetadataEditorProps {
  filename: string;
  initialData?: {
    title?: string;
    description?: string;
    duration?: number;
    tags?: string[];
  };
}

export default function MetadataEditor({ filename, initialData }: MetadataEditorProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    tags: initialData?.tags?.join(', ') || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await axios.post('/api/metadata', {
        filename,
        metadata: {
          ...formData,
          tags: formData.tags.split(/[,，]/).map(t => t.trim())
        }
      });
      alert('元数据保存成功！');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查控制台');
    }
  };

  return (
    <div className="metadata-editor">
      <h3>编辑元数据</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>标题：</label>
          <input 
            type="text"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>描述：</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>标签（逗号分隔）：</label>
          <input
            type="text"
            value={formData.tags}
            onChange={e => setFormData({...formData, tags: e.target.value})}
          />
        </div>
        <button type="submit">保存元数据</button>
      </form>
    </div>
  );
}