import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/components.css';

interface MetadataEditorProps {
  filename: string;
  initialData?: {
    title?: string;
    description?: string;
    duration?: number;
    tags?: string[];
  };
}

export default function MetadataEditor({ filename }: MetadataEditorProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: ''
  });

  // 加载现有元数据
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/metadata/${filename}`);
        const metadata = response.data;
        
        if (Object.keys(metadata).length > 0) {
          setFormData({
            title: metadata.title || '',
            description: metadata.description || '',
            tags: metadata.tags ? metadata.tags.join(', ') : ''
          });
        }
      } catch (error) {
        console.error('获取元数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetadata();
  }, [filename]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await axios.post('/api/metadata', {
        filename,
        metadata: {
          ...formData,
          tags: formData.tags.split(/[,，]/).map(t => t.trim()).filter(t => t)
        }
      });
      alert('元数据保存成功！');
      navigate('/files');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查控制台');
    }
  };

  if (loading) {
    return <div className="loading-spinner">加载中...</div>;
  }

  return (
    <div className="metadata-editor">
      <h2>编辑元数据: {filename}</h2>
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
            rows={5}
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
        <div className="form-actions">
          <button type="submit" className="save-btn">保存元数据</button>
          <button type="button" className="cancel-btn" onClick={() => navigate('/files')}>取消</button>
        </div>
      </form>
    </div>
  );
}