'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, FileText, Clock, User, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  templateId: string;
  templateName: string;
  action: 'create' | 'update' | 'delete';
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  userId?: string;
  userEmail?: string;
  timestamp: any; // Firestore timestamp
  metadata?: {
    ip?: string;
    userAgent?: string;
    source?: string;
  };
}

interface TemplateAuditLogProps {
  templateId?: string;
  userId?: string;
  className?: string;
}

export function TemplateAuditLog({ templateId, userId, className }: TemplateAuditLogProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'create' | 'update' | 'delete'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (templateId) params.append('templateId', templateId);
      if (userId) params.append('userId', userId);
      if (filter !== 'all') params.append('action', filter);

      const response = await fetch(`/api/task-templates/audit?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      } else {
        console.error('Failed to fetch audit logs');
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [templateId, userId, filter]);

  const filteredLogs = auditLogs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.templateName.toLowerCase().includes(term) ||
      log.userEmail?.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term)
    );
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';

    // Handle Firestore timestamp
    if (timestamp?.seconds) {
      return format(new Date(timestamp.seconds * 1000), 'MMM dd, yyyy HH:mm:ss');
    }

    // Handle regular date string
    return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
  };

  const renderChangeDetail = (change: any) => {
    const formatValue = (value: any) => {
      if (value === null || value === undefined) return 'empty';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
      if (typeof value === 'string' && value.length > 100) {
        return value.substring(0, 100) + '...';
      }
      return String(value);
    };

    return (
      <div key={change.field} className="py-2 border-b last:border-0">
        <div className="font-medium text-sm mb-1">{change.field}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Old: </span>
            <code className="bg-muted px-1 py-0.5 rounded">
              {formatValue(change.oldValue)}
            </code>
          </div>
          <div>
            <span className="text-muted-foreground">New: </span>
            <code className="bg-green-100 dark:bg-green-900/30 px-1 py-0.5 rounded">
              {formatValue(change.newValue)}
            </code>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template Audit Trail
              </CardTitle>
              <CardDescription>
                Track all changes made to task templates
              </CardDescription>
            </div>
            <Button
              onClick={fetchAuditLogs}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by template or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Creates Only</SelectItem>
                <SelectItem value="update">Updates Only</SelectItem>
                <SelectItem value="delete">Deletes Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audit Logs List */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <Card
                    key={log.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionColor(log.action)}>
                            {log.action.toUpperCase()}
                          </Badge>
                          <span className="font-medium text-sm">
                            {log.templateName}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.userEmail || log.userId || 'System'}
                        </div>
                        {log.changes && log.changes.length > 0 && (
                          <span>{log.changes.length} changes</span>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {selectedLog?.id === log.id && log.changes && log.changes.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-sm font-medium mb-2">Changes:</div>
                          <div className="space-y-2">
                            {log.changes.map(renderChangeDetail)}
                          </div>

                          {log.metadata && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="text-sm font-medium mb-2">Metadata:</div>
                              <div className="text-xs space-y-1">
                                {log.metadata.ip && (
                                  <div>
                                    <span className="text-muted-foreground">IP: </span>
                                    {log.metadata.ip}
                                  </div>
                                )}
                                {log.metadata.source && (
                                  <div>
                                    <span className="text-muted-foreground">Source: </span>
                                    {log.metadata.source}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Summary */}
          {!loading && filteredLogs.length > 0 && (
            <div className="mt-4 pt-4 border-t flex justify-between text-sm text-muted-foreground">
              <span>{filteredLogs.length} audit log entries</span>
              <span>
                Last update: {formatTimestamp(filteredLogs[0]?.timestamp)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}