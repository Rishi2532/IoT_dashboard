       <div className="text-center">
              {populationTracking?.change &&
              populationTracking.change.change !== 0 ? (
                formatChangeWithSign(populationTracking.change.change)
              ) : selectedRegion === "all" ? (
                <div className="text-slate-200 text-xs">No change</div>
              ) : (
                netPopulationChange !== 0 &&
                formatChangeWithSign(netPopulationChange)
              )}
              <div className="text-slate-200 text-xs mt-1">
                {populationTracking?.change ? (
                  <>
                    <span
                      className={
                        populationTracking.change.change > 0
                          ? "text-green-200"
                          : "text-red-200"
                      }
                    >
                      {formatPercentage(
                        Math.abs(populationTracking.change.changePercent),
                      )}
                      %
                    </span>
                    <br />
                    <span className="text-xs text-slate-100">
                      {selectedRegion === "all"
                        ? "from yesterday"
                        : `${selectedRegion} daily change`}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className={
                        netPopulationChange > 0
                          ? "text-green-200"
                          : "text-red-200"
                      }
                    >
                      {formatPercentage(Math.abs(waterGainedPercent))}%
                    </span>
                    <br />
                    <span className="text-xs text-slate-100">change</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-slate-100" />
              <span className="text-xs font-medium text-slate-100">
                Population Covered
              </span>
            </div>
          </div>
        </div>

        {/* Population With Water */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-teal-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.population_with_water)}
            </div>
          </div>

          {/* Change number and percentages - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {populationStats.population_gained_water !== 0 &&
                formatChangeWithSign(populationStats.population_gained_water)}
              <div className="text-teal-200 text-sm mt-1 leading-tight">
                <span
                  className={
                    populationStats.population_gained_water > 0
                      ? "text-green-200"
                      : "text-red-200"
                  }
                >
                  {formatPercentage(withWaterChangePercentage)}%
                </span>
                <br />
                {/* <span className="text-xs text-teal-100">
                  {formatPercentage(withWaterPercentage)}% coverage
                </span> */}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3 text-teal-100" />
              <span className="text-xs font-medium text-teal-100">
                Populating Receiving Water
              </span>
            </div>
          </div>
        </div>

        {/* Population No Water */}
        <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-rose-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.population_no_water)}
            </div>
          </div>

          {/* Center: Change number and percentages */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {populationStats.population_lost_water > 0 &&
                formatChangeWithSign(populationStats.population_lost_water)}
              <div className="text-rose-200 text-sm mt-1 leading-tight">
                <span
                  className={
                    populationStats.population_lost_water > 0
                      ? "text-red-200"
                      : "text-rose-200"
                  }
                >
                  {formatPercentage(noWaterChangePercentage)}%
                </span>
                <br />
                {/* <span className="text-xs text-rose-100">
                  {formatPercentage(noWaterPercentage)}% coverage
                </span> */}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-100" />
              <span className="text-xs font-medium text-rose-100">
                Population Receiving No Water
              </span>
            </div>
          </div>
        </div>

        {/* Population with LPCD > 55 */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-emerald-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.population_lpcd_above_55)}
            </div>
          </div>

          {/* Change number - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {lpcdAbove55Change !== 0 &&
                formatChangeWithSign(lpcdAbove55Change)}
              <div className="text-emerald-200 text-sm mt-1 leading-tight">
                <span
                  className={
                    lpcdAbove55Change >= 0 ? "text-green-200" : "text-red-200"
                  }
                >
                  {formatPercentage(lpcdAbove55ChangePercentage)}%
                </span>
                <br />
                {/* <span className="text-xs text-emerald-100">
                  {formatPercentage(lpcdAbove55Percentage)}% coverage
                </span> */}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-emerald-100">
                Population with LPCD &gt; 55
              </span>
            </div>
          </div>
        </div>

        {/* Population with LPCD ≤ 55 */}
        <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-white relative shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl h-40 border border-amber-400/20">
          {/* Population number - top left */}
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold">
              {formatNumber(populationStats.population_lpcd_below_55)}
            </div>
          </div>

          {/* Change number - center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {lpcdBelow55Change !== 0 && (
                <div
                  className={`flex items-center gap-1 font-bold ${
                    lpcdBelow55Change <= 0 ? "text-green-300" : "text-red-300"
                  }`}
                >
                  <span className="text-lg">
                    {lpcdBelow55Change <= 0 ? "+" : "-"}
                  </span>
                  <span>{Math.abs(lpcdBelow55Change)}</span>
                </div>
              )}
              <div className="text-amber-200 text-sm mt-1 leading-tight">
                <span
                  className={
                    lpcdBelow55Change <= 0 ? "text-green-200" : "text-red-200"
                  }
                >
                  {formatPercentage(lpcdBelow55ChangePercentage)}%
                </span>
                <br />
                {/* <span className="text-xs text-amber-100">
                  {formatPercentage(lpcdBelow55Percentage)}% coverage
                </span> */}
              </div>
            </div>
          </div>

          {/* Description - bottom left */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1">
              {/* <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">≤55</span>
              </div> */}
              <span className="text-xs font-medium text-amber-100">
                Population With LPCD &lt; 55
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
