import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Folder, File, FileText, FileCode, List, TableProperties, Eye, Search, X, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { cn } from '../lib/utils';
import CodeEditor from './CodeEditor';
import ImageViewer from './ImageViewer';
import { api } from '../utils/api';

function FileTree({ selectedProject }) {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewMode, setViewMode] = useState('detailed'); // 'simple', 'detailed', 'compact'
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState([]);

  // New state for single-level browsing
  const [currentPath, setCurrentPath] = useState('');
  const [projectRoot, setProjectRoot] = useState('');

  // Initialize with project root path
  useEffect(() => {
    if (selectedProject) {
      setProjectRoot(selectedProject.path);
      setCurrentPath('');
      fetchFiles('');
    }
  }, [selectedProject]);

  // Load view mode preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('file-tree-view-mode');
    if (savedViewMode && ['simple', 'detailed', 'compact'].includes(savedViewMode)) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchQuery]);

  const fetchFiles = async (path) => {
    setLoading(true);
    try {
      const url = new URL(`/api/projects/${selectedProject.name}/files`, window.location.origin);
      if (path) {
        url.searchParams.set('path', path);
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ File fetch failed:', response.status, errorText);
        setFiles([{ error: true, message: errorText || `Failed to load files (${response.status})` }]);
        return;
      }

      const data = await response.json();

      // Add ".." entry if not at root
      const filesWithParent = path ? [
        { name: '..', type: 'parent', path: getParentPath(path) },
        ...data
      ] : data;

      setFiles(filesWithParent);
    } catch (error) {
      console.error('❌ Error fetching files:', error);
      setFiles([{ error: true, message: error.message || 'Failed to load files' }]);
    } finally {
      setLoading(false);
    }
  };

  // Get parent directory path
  const getParentPath = (path) => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  };

  // Get breadcrumb parts
  const getBreadcrumbs = () => {
    if (!currentPath) return [{ name: selectedProject.displayName || selectedProject.name, path: '' }];

    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: selectedProject.displayName || selectedProject.name, path: '' }];

    let buildPath = '';
    parts.forEach(part => {
      buildPath += '/' + part;
      breadcrumbs.push({ name: part, path: buildPath });
    });

    return breadcrumbs;
  };

  const handleItemClick = (item) => {
    if (item.type === 'parent') {
      // Go up one level
      setCurrentPath(item.path);
      fetchFiles(item.path);
    } else if (item.type === 'directory') {
      // Enter directory
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      setCurrentPath(newPath);
      fetchFiles(newPath);
    } else if (isImageFile(item.name)) {
      // Open image in viewer
      setSelectedImage({
        name: item.name,
        path: item.path,
        projectPath: selectedProject.path,
        projectName: selectedProject.name
      });
    } else {
      // Open file in editor
      setSelectedFile({
        name: item.name,
        path: item.path,
        projectPath: selectedProject.path,
        projectName: selectedProject.name
      });
    }
  };

  const handleBreadcrumbClick = (path) => {
    setCurrentPath(path);
    fetchFiles(path);
  };

  // Change view mode and save preference
  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('file-tree-view-mode', mode);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date as relative time
  const formatRelativeTime = (date) => {
    if (!date) return '-';
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return t('fileTree.justNow');
    if (diffInSeconds < 3600) return t('fileTree.minAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('fileTree.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 2592000) return t('fileTree.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
    return past.toLocaleDateString();
  };

  const isImageFile = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'];
    return imageExtensions.includes(ext);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();

    const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'];
    const docExtensions = ['md', 'txt', 'doc', 'pdf'];
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'];

    if (codeExtensions.includes(ext)) {
      return <FileCode className="w-4 h-4 text-green-500 flex-shrink-0" />;
    } else if (docExtensions.includes(ext)) {
      return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    } else if (imageExtensions.includes(ext)) {
      return <File className="w-4 h-4 text-purple-500 flex-shrink-0" />;
    } else {
      return <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          {t('fileTree.loading')}
        </div>
      </div>
    );
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header with Breadcrumb and Controls */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 min-w-0">
          <Home className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <button
                  onClick={() => handleBreadcrumbClick(crumb.path)}
                  className={cn(
                    "text-sm truncate hover:text-foreground transition-colors",
                    index === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{t('fileTree.files')}</h3>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'simple' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => changeViewMode('simple')}
              title={t('fileTree.simpleView')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => changeViewMode('compact')}
              title={t('fileTree.compactView')}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => changeViewMode('detailed')}
              title={t('fileTree.detailedView')}
            >
              <TableProperties className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('fileTree.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-accent"
              onClick={() => setSearchQuery('')}
              title={t('fileTree.clearSearch')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Column Headers for Detailed View */}
      {viewMode === 'detailed' && filteredFiles.length > 0 && (
        <div className="px-4 pt-2 pb-1 border-b border-border">
          <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-6">{t('fileTree.name')}</div>
            <div className="col-span-2">{t('fileTree.size')}</div>
            <div className="col-span-4">{t('fileTree.modified')}</div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
        {files.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
              <Folder className="w-6 h-6 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-foreground mb-1">{t('fileTree.noFilesFound')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('fileTree.checkProjectPath')}
            </p>
          </div>
        ) : files.length === 1 && files[0].error ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">⚠️</span>
            </div>
            <h4 className="font-medium text-foreground mb-2">Error loading files</h4>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {files[0].message}
            </p>
            <p className="text-xs text-muted-foreground">
              The project path may not exist in the container environment.
            </p>
          </div>
        ) : filteredFiles.length === 0 && searchQuery ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-foreground mb-1">{t('fileTree.noMatchesFound')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('fileTree.tryDifferentSearch')}
            </p>
          </div>
        ) : (
          <div className={viewMode === 'detailed' ? '' : 'space-y-1'}>
            {viewMode === 'simple' && (
              <div className="space-y-1">
                {filteredFiles.map((item) => (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="w-full justify-start p-2 h-auto font-normal text-left hover:bg-accent"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      {item.type === 'parent' ? (
                        <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : item.type === 'directory' ? (
                        <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        getFileIcon(item.name)
                      )}
                      <span className="text-sm truncate text-foreground">
                        {item.name}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {viewMode === 'compact' && (
              <div className="space-y-1">
                {filteredFiles.map((item) => (
                  <div
                    key={item.path}
                    className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer rounded"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.type === 'parent' ? (
                        <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : item.type === 'directory' ? (
                        <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        getFileIcon(item.name)
                      )}
                      <span className="text-sm truncate text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {item.type === 'file' && (
                        <>
                          <span>{formatFileSize(item.size)}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'detailed' && (
              <div className="space-y-1">
                {filteredFiles.map((item) => (
                  <div
                    key={item.path}
                    className="grid grid-cols-12 gap-2 p-2 hover:bg-accent cursor-pointer items-center rounded"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="col-span-6 flex items-center gap-2 min-w-0">
                      {item.type === 'parent' ? (
                        <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : item.type === 'directory' ? (
                        <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        getFileIcon(item.name)
                      )}
                      <span className="text-sm truncate text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {item.type === 'file' ? formatFileSize(item.size) : '-'}
                    </div>
                    <div className="col-span-4 text-sm text-muted-foreground">
                      {item.type === 'file' ? formatRelativeTime(item.modified) : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Code Editor Modal */}
      {selectedFile && (
        <CodeEditor
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          projectPath={selectedFile.projectPath}
        />
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          file={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}

export default FileTree;
