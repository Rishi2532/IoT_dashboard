import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useState } from "react";
import { Activity, Zap, Droplets, BarChart3, Wifi, WifiOff, Clock, AlertTriangle, TrendingUp, TrendingDown, CheckCircle2, XCircle, Gauge } from "lucide-react";

interface CommunicationOverview {
  total_esrs: number;
  chlorine_online: number;
  pressure_online: number;
  flow_meter_online: number;
  chlorine_connected: number;
  pressure_connected: number;
  flow_meter_connected: number;
  chlorine_offline: number;
  pressure_offline: number;
  flow_meter_offline: number;
  chlorine_less_72h: number;
  chlorine_more_72h: number;
  pressure_less_72h: number;
  pressure_more_72h: number;
  flow_meter_less_72h: number;
  flow_meter_more_72h: number;
}

interface CommunicationStats {
  region: string;
  total_records: number;
  total_schemes: number;
  total_villages: number;
  online_chlorine: number;
  online_pressure: number;
  online_flow_meter: number;
}

interface CommunicationScheme {
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  chlorine_status: string;
  pressure_status: string;
  flow_meter_status: string;
  overall_status: string;
  chlorine_0h_72h: string;
  chlorine_72h: string;
  pressure_0h_72h: string;
  pressure_72h: string;
  flow_meter_0h_72h: string;
  flow_meter_72h: string;
}

interface FilterOptions {
  regions: string[];
  circles: string[];
  divisions: string[];
  subdivisions: string[];
  blocks: string[];
}

export default function CommunicationStatusPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["/api/communication-status/overview", selectedRegion, selectedCircle, selectedDivision, selectedSubdivision, selectedBlock],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedCircle !== "all") params.set("circle", selectedCircle);
      if (selectedDivision !== "all") params.set("division", selectedDivision);
      if (selectedSubdivision !== "all") params.set("subdivision", selectedSubdivision);
      if (selectedBlock !== "all") params.set("block", selectedBlock);
      
      const response = await fetch(`/api/communication-status/overview?${params.toString()}`);
      return response.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/communication-status/stats"],
  });

  const { data: schemes, isLoading: schemesLoading } = useQuery({
    queryKey: ["/api/communication-status/schemes", selectedRegion, selectedCircle, selectedDivision, selectedSubdivision, selectedBlock],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedCircle !== "all") params.set("circle", selectedCircle);
      if (selectedDivision !== "all") params.set("division", selectedDivision);
      if (selectedSubdivision !== "all") params.set("subdivision", selectedSubdivision);
      if (selectedBlock !== "all") params.set("block", selectedBlock);
      
      const response = await fetch(`/api/communication-status/schemes?${params.toString()}`);
      return response.json();
    },
  });

  const { data: filters } = useQuery({
    queryKey: ["/api/communication-status/filters"],
    queryFn: async () => {
      const response = await fetch("/api/communication-status/filters");
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return <Badge variant="default" className="bg-green-500"><Wifi className="w-3 h-3 mr-1" />Online</Badge>;
      case 'offline':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTimeBadge = (lessThan72h: string, moreThan72h: string) => {
    const has72h = moreThan72h === '1';
    const hasLess72h = lessThan72h === '1';
    
    if (has72h && hasLess72h) {
      return (
        <div className="flex space-x-1">
          <Badge variant="outline" className="text-orange-600">
            <Clock className="w-3 h-3 mr-1" />&lt;72h
          </Badge>
          <Badge variant="outline" className="text-red-600">
            <AlertTriangle className="w-3 h-3 mr-1" />&gt;72h
          </Badge>
        </div>
      );
    } else if (has72h) {
      return (
        <Badge variant="outline" className="text-red-600">
          <AlertTriangle className="w-3 h-3 mr-1" />&gt;72h
        </Badge>
      );
    } else if (hasLess72h) {
      return (
        <Badge variant="outline" className="text-orange-600">
          <Clock className="w-3 h-3 mr-1" />&lt;72h
        </Badge>
      );
    }
    return <Badge variant="secondary">No Data</Badge>;
  };

  // Get unique schemes to avoid duplicates
  const uniqueSchemes = Array.isArray(schemes) ? schemes.reduce((acc: CommunicationScheme[], current: CommunicationScheme) => {
    const existing = acc.find(item => 
      item.scheme_id === current.scheme_id && 
      item.village_name === current.village_name && 
      item.esr_name === current.esr_name
    );
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, []) : [];

  // Pagination calculations
  const totalItems = uniqueSchemes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSchemes = uniqueSchemes.slice(startIndex, endIndex);

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Communication Status Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring of communication infrastructure across Maharashtra</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Communication Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Select value={selectedRegion} onValueChange={(value) => {setSelectedRegion(value); resetPage();}}>
              <SelectTrigger>
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {filters?.regions?.map((region: string) => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedCircle} onValueChange={(value) => {setSelectedCircle(value); resetPage();}}>
              <SelectTrigger>
                <SelectValue placeholder="Select Circle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Circles</SelectItem>
                {filters?.circles?.map((circle: string) => (
                  <SelectItem key={circle} value={circle}>{circle}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDivision} onValueChange={(value) => {setSelectedDivision(value); resetPage();}}>
              <SelectTrigger>
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {filters?.divisions?.map((division: string) => (
                  <SelectItem key={division} value={division}>{division}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubdivision} onValueChange={(value) => {setSelectedSubdivision(value); resetPage();}}>
              <SelectTrigger>
                <SelectValue placeholder="Select Sub Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub Divisions</SelectItem>
                {filters?.subdivisions?.map((subdivision: string) => (
                  <SelectItem key={subdivision} value={subdivision}>{subdivision}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBlock} onValueChange={(value) => {setSelectedBlock(value); resetPage();}}>
              <SelectTrigger>
                <SelectValue placeholder="Select Block" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blocks</SelectItem>
                {filters?.blocks?.map((block: string) => (
                  <SelectItem key={block} value={block}>{block}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Overview Cards */}
      {!overviewLoading && overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total ESRs Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-blue-900">Total ESRs</span>
                </div>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-2">{overview.total_esrs}</div>
              <div className="text-sm text-blue-600/70">Infrastructure Units</div>
            </CardContent>
          </Card>

          {/* Chlorine Sensors Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-cyan-50 via-white to-cyan-50">
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-cyan-500/10 rounded-lg mr-3">
                    <Droplets className="w-5 h-5 text-cyan-600" />
                  </div>
                  <span className="text-cyan-900">Chlorine Sensors</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">
                    {((overview.chlorine_online / (overview.chlorine_online + overview.chlorine_offline || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Online</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{overview.chlorine_online}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Offline</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{overview.chlorine_offline}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-600">Fresh: {overview.chlorine_less_72h}</span>
                    <span className="text-red-600">Stale: {overview.chlorine_more_72h}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pressure Sensors Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 via-white to-orange-50">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-500/10 rounded-lg mr-3">
                    <Gauge className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-orange-900">Pressure Sensors</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">
                    {((overview.pressure_online / (overview.pressure_online + overview.pressure_offline || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Online</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{overview.pressure_online}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Offline</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{overview.pressure_offline}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-600">Fresh: {overview.pressure_less_72h}</span>
                    <span className="text-red-600">Stale: {overview.pressure_more_72h}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flow Meters Card */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 via-white to-green-50">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-500/10 rounded-lg mr-3">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-green-900">Flow Meters</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">
                    {((overview.flow_meter_online / (overview.flow_meter_online + overview.flow_meter_offline || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Online</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{overview.flow_meter_online}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Offline</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{overview.flow_meter_offline}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-600">Fresh: {overview.flow_meter_less_72h}</span>
                    <span className="text-red-600">Stale: {overview.flow_meter_more_72h}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Regional Statistics */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat: CommunicationStats) => (
            <Card key={stat.region} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{stat.region}</CardTitle>
                <CardDescription>
                  {stat.total_schemes} schemes, {stat.total_villages} villages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <Droplets className="w-4 h-4 mr-1 text-blue-400" />
                      Chlorine
                    </span>
                    <span className="text-sm font-medium">{stat.online_chlorine}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <Activity className="w-4 h-4 mr-1 text-orange-400" />
                      Pressure
                    </span>
                    <span className="text-sm font-medium">{stat.online_pressure}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <Zap className="w-4 h-4 mr-1 text-green-400" />
                      Flow Meter
                    </span>
                    <span className="text-sm font-medium">{stat.online_flow_meter}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schemes List with Pagination */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <span>Scheme Communication Status</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({totalItems} records)
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </CardTitle>
          <CardDescription>
            Detailed view of communication status for each scheme and ESR
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schemesLoading ? (
            <div className="text-center py-8">Loading scheme data...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>ESR Name</TableHead>
                    <TableHead>Chlorine</TableHead>
                    <TableHead>Pressure</TableHead>
                    <TableHead>Flow Meter</TableHead>
                    <TableHead>Time Status</TableHead>
                    <TableHead>Overall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSchemes.length > 0 ? (
                    currentSchemes.map((scheme: CommunicationScheme, index: number) => (
                      <TableRow key={`${scheme.scheme_id}-${scheme.village_name}-${scheme.esr_name}-${index}`}>
                        <TableCell className="font-medium">{scheme.scheme_name}</TableCell>
                        <TableCell>{scheme.village_name}</TableCell>
                        <TableCell>{scheme.esr_name}</TableCell>
                        <TableCell>{getStatusBadge(scheme.chlorine_status)}</TableCell>
                        <TableCell>{getStatusBadge(scheme.pressure_status)}</TableCell>
                        <TableCell>{getStatusBadge(scheme.flow_meter_status)}</TableCell>
                        <TableCell>
                          {getTimeBadge(scheme.chlorine_0h_72h, scheme.chlorine_72h)}
                        </TableCell>
                        <TableCell>{getStatusBadge(scheme.overall_status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No communication data found for the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={`page-${pageNum}`}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}