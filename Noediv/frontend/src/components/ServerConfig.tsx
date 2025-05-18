import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/components.css';

interface ServerConfigProps {
  config: {
    protocol: string;
    url: string;
    username: string;
    password: string;
  };
  saveConfig: (config: {
    protocol: string;
    url: string;
    username: string;
    password: string;
  }) => void;
}

export default function ServerConfig({ config, saveConfig }: ServerConfigProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(config);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 保存配置
    saveConfig(formData);
    
    // 测试连接
    setTestStatus('testing');
    try {
      let endpoint = '';
      if (formData.protocol === 'webdav') {
        endpoint = `/api/webdav/files?url=${encodeURIComponent(formData.url)}&username=${encodeURIComponent(formData.username)}&password=${encodeURIComponent(formData.password)}`;
      } else if (formData.protocol === 'ftp') {
        endpoint = `/api/ftp/files?url=${encodeURIComponent(formData.url)}&username=${encodeURIComponent(formData.username)}&password=${encodeURIComponent(formData.password)}`;
      } else {
        // 默认使用本地配置
        endpoint = '/api/files';
      }
      
      const response = await fetch(endpoint);
      if (response.ok) {
        setTestStatus('success');
        // 导航到文件列表
        setTimeout(() => {
          navigate('/files');
        }, 1000);
      } else {
        setTestStatus('failed');
      }
    } catch (error) {
      console.error('连接测试失败:', error);
      setTestStatus('failed');
    }
  };

  return (
    <div className="server-config-container">
      <h2>服务器配置</h2>
      
      <form onSubmit={handleSubmit} className="config-form">
        <div className="form-group">
          <label>协议：</label>
          <select 
            value={formData.protocol} 
            onChange={e => setFormData({...formData, protocol: e.target.value})}
          >
            <option value="">默认（使用.env配置）</option>
            <option value="webdav">WebDAV</option>
            <option value="ftp">FTP</option>
            <option value="smb">Samba</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>服务器地址：</label>
          <input 
            type="text" 
            value={formData.url}
            placeholder="例如：http://webdav.example.com"
            onChange={e => setFormData({...formData, url: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label>用户名：</label>
          <input 
            type="text" 
            value={formData.username} 
            onChange={e => setFormData({...formData, username: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label>密码：</label>
          <input 
            type="password" 
            value={formData.password} 
            onChange={e => setFormData({...formData, password: e.target.value})}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn">保存配置</button>
          <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>取消</button>
        </div>
        
        {testStatus === 'testing' && (
          <div className="status-message testing">
            正在测试连接...
          </div>
        )}
        
        {testStatus === 'success' && (
          <div className="status-message success">
            连接成功！
          </div>
        )}
        
        {testStatus === 'failed' && (
          <div className="status-message failed">
            连接失败，请检查配置。
          </div>
        )}
      </form>
    </div>
  );
} 