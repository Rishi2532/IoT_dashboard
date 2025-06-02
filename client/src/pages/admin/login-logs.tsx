import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, Clock, Globe, Monitor } from "lucide-react";
import { format } from "date-fns";

interface UserLoginLog {
  id: number;
  user_id: number;
  username: string;
  user_name: string | null;
  login_time: string;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
}

export default function LoginLogsPage() {
  const [limit, setLimit] = useState(50);
  const [userIdFilter, setUserIdFilter] = useState("");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/login-logs', limit, userIdFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (userIdFilter) {
        params.append('userId', userIdFilter);
      }
      
      const response = await fetch(`/api/auth/login-logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch login logs');
      }
      return response.json();
    },
  });

  const formatUserAgent = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';
    
    // Extract browser info from user agent
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Login Logs</h1>
          <p className="text-muted-foreground">Monitor user authentication activity</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Filter Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">User ID Filter</label>
              <Input
                placeholder="Enter user ID to filter..."
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
              />
            </div>
            <div className="w-32">
              <label className="text-sm font-medium">Limit</label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                min="1"
                max="1000"
              />
            </div>
            <Button 
              onClick={() => refetch()} 
              className="h-10"
            >
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Login Activity ({logs.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading login logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No login logs found</p>
              <p className="text-sm">Login activity will appear here once users start logging in</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: UserLoginLog) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{log.user_name || log.username}</div>
                          <div className="text-sm text-muted-foreground">
                            @{log.username} (ID: {log.user_id})
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {format(new Date(log.login_time), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(log.login_time), 'hh:mm:ss a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {log.ip_address || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary">
                            {formatUserAgent(log.user_agent)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs text-muted-foreground max-w-20 truncate">
                          {log.session_id ? log.session_id.substring(0, 8) + '...' : 'N/A'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}