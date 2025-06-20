import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Wifi, WifiOff, Activity, Clock, Signal, SignalHigh, Database, Filter } from "lucide-react";
import CommunicationOverviewCards from "@/components/communication/CommunicationOverviewCards";
import CommunicationSchemesList from "@/components/communication/CommunicationSchemesList";

export default function CommunicationStatusPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedSubDivision, setSelectedSubDivision] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [dataFreshness, setDataFreshness] = useState<string>("all");

  // Fetch filter options based on current selections
  const { data: filterOptions } = useQuery({
    queryKey: ["/api/communication/filters", selectedRegion, selectedCircle, selectedDivision, selectedSubDivision],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.append("region", selectedRegion);
      if (selectedCircle !== "all") params.append("circle", selectedCircle);
      if (selectedDivision !== "all") params.append("division", selectedDivision);
      if (selectedSubDivision !== "all") params.append("sub_division", selectedSubDivision);
      
      const response = await fetch(`/api/communication/filters?${params}`);
      if (!response.ok) throw new Error("Failed to fetch filters");
      return response.json();
    },
  });

  // Fetch communication statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/communication/stats"],
  });

  const resetFilters = () => {
    setSelectedRegion("all");
    setSelectedCircle("all");
    setSelectedDivision("all");
    setSelectedSubDivision("all");
    setSelectedBlock("all");
    setDataFreshness("all");
  };

  const getDataFreshnessIcon = (freshness: string) => {
    switch (freshness) {
      case "fresh":
        return <SignalHigh className="h-4 w-4" />;
      case "stale":
        return <Clock className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getDataFreshnessColor = (freshness: string) => {
    switch (freshness) {
      case "fresh":
        return "bg-green-100 text-green-800 border-green-200";
      case "stale":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Status</h1>
          <p className="text-muted-foreground">
            Monitor ESR equipment communication status across Maharashtra water infrastructure
          </p>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total ESRs</p>
                    <p className="text-2xl font-bold">{stats.total_esrs?.toLocaleString() || '0'}</p>
                  </div>
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Schemes</p>
                    <p className="text-2xl font-bold">{stats.total_schemes?.toLocaleString() || '0'}</p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Villages</p>
                    <p className="text-2xl font-bold">{stats.total_villages?.toLocaleString() || '0'}</p>
                  </div>
                  <Signal className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Regions</p>
                    <p className="text-2xl font-bold">{stats.regions || '0'}</p>
                  </div>
                  <Wifi className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Update</p>
                    <p className="text-sm font-bold">
                      {stats.last_update ? new Date(stats.last_update).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Options
          </CardTitle>
          <CardDescription>
            Filter communication status by geographic location and data freshness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            {/* Region Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Region</label>
              <Select value={selectedRegion} onValueChange={(value) => {
                setSelectedRegion(value);
                setSelectedCircle("all");
                setSelectedDivision("all");
                setSelectedSubDivision("all");
                setSelectedBlock("all");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {filterOptions?.regions?.map((region: string) => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Circle Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Circle</label>
              <Select value={selectedCircle} onValueChange={(value) => {
                setSelectedCircle(value);
                setSelectedDivision("all");
                setSelectedSubDivision("all");
                setSelectedBlock("all");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select circle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Circles</SelectItem>
                  {filterOptions?.circles?.map((circle: string) => (
                    <SelectItem key={circle} value={circle}>{circle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Division Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Division</label>
              <Select value={selectedDivision} onValueChange={(value) => {
                setSelectedDivision(value);
                setSelectedSubDivision("all");
                setSelectedBlock("all");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {filterOptions?.divisions?.map((division: string) => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub Division Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub Division</label>
              <Select value={selectedSubDivision} onValueChange={(value) => {
                setSelectedSubDivision(value);
                setSelectedBlock("all");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub Divisions</SelectItem>
                  {filterOptions?.sub_divisions?.map((subDiv: string) => (
                    <SelectItem key={subDiv} value={subDiv}>{subDiv}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Block Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Block</label>
              <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                <SelectTrigger>
                  <SelectValue placeholder="Select block" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blocks</SelectItem>
                  {filterOptions?.blocks?.map((block: string) => (
                    <SelectItem key={block} value={block}>{block}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Freshness Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Freshness</label>
              <Select value={dataFreshness} onValueChange={setDataFreshness}>
                <SelectTrigger>
                  <SelectValue placeholder="Select freshness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="fresh">Fresh (&lt;72h)</SelectItem>
                  <SelectItem value="stale">Stale (&gt;72h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedRegion !== "all" && (
              <Badge variant="outline" className="bg-blue-50">
                Region: {selectedRegion}
              </Badge>
            )}
            {selectedCircle !== "all" && (
              <Badge variant="outline" className="bg-blue-50">
                Circle: {selectedCircle}
              </Badge>
            )}
            {selectedDivision !== "all" && (
              <Badge variant="outline" className="bg-blue-50">
                Division: {selectedDivision}
              </Badge>
            )}
            {selectedSubDivision !== "all" && (
              <Badge variant="outline" className="bg-blue-50">
                Sub Division: {selectedSubDivision}
              </Badge>
            )}
            {selectedBlock !== "all" && (
              <Badge variant="outline" className="bg-blue-50">
                Block: {selectedBlock}
              </Badge>
            )}
            {dataFreshness !== "all" && (
              <Badge variant="outline" className={getDataFreshnessColor(dataFreshness)}>
                {getDataFreshnessIcon(dataFreshness)}
                <span className="ml-1">
                  {dataFreshness === "fresh" ? "Fresh Data" : "Stale Data"}
                </span>
              </Badge>
            )}
            {(selectedRegion !== "all" || selectedCircle !== "all" || selectedDivision !== "all" || 
              selectedSubDivision !== "all" || selectedBlock !== "all" || dataFreshness !== "all") && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <CommunicationOverviewCards
        region={selectedRegion}
        circle={selectedCircle}
        division={selectedDivision}
        subDivision={selectedSubDivision}
        block={selectedBlock}
        dataFreshness={dataFreshness}
      />

      {/* Schemes List */}
      <CommunicationSchemesList
        region={selectedRegion}
        circle={selectedCircle}
        division={selectedDivision}
        subDivision={selectedSubDivision}
        block={selectedBlock}
        dataFreshness={dataFreshness}
      />
    </div>
  );
}