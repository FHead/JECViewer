var Chart;
var Plot;
var PlotData;
var XY;
var HashLockdown;
var CurveUpdateLock;
var LatestPosition;
var PositionTimeout = null;
var OldCurveCount = -1;
var OldPlotDataLength = -1;
var MinAnimationTime = 150;
var AnimationTime = 300;
var AvailableListLock;
var AvailableList = [];
var InProgressList = [];

function UniqueValues(List, Field, Item)
{
   var Values = [];
   for(Index in List)
      Values.push(List[Index][Field]);
   Results = Values.filter(function(value, index, self) {return self.indexOf(value) == index;}).sort();

   CurrentValue = Item.val();

   Item.empty();
   for(var Index in Results)
      Item.append("<option value = \"" + Results[Index] + "\">" + Results[Index] + "</option>");

   if(Results.includes(CurrentValue))
      Item.val(CurrentValue);
}

function FindVersion(Version, Algorithm)
{
   return Versions.filter(function(item)
   {
      return (Version == "NoMatch"  || item.Version == Version)
         && (Algorithm == "NoMatch" || item.Algorithm == Algorithm);
   });
}

function FindRecord(Version, Algorithm, Level, Dependency, Selection)
{
   return Data.filter(function(item)
   {
      return (Version == "NoMatch"   || item.Version == Version)
         && (Algorithm == "NoMatch"  || item.Algorithm == Algorithm)
         && (Level == "NoMatch"      || item.Level == Level)
         && (Dependency == "NoMatch" || item.Dependency == Dependency)
         && (Selection == "NoMatch"  || item.Selection == Selection);
   });
}

function SetListOfVersions(Index)
{
   UniqueValues(Versions, "Version", $('#Version'+Index));
   SetListOfAlgorithms(Index);
}

function SetListOfAlgorithms(Index)
{
   Version = $('#Version'+Index).val();
   UniqueValues(FindVersion(Version, "NoMatch"),
      "Algorithm", $('#Algorithm'+Index));
   SetListOfLevels(Index);
}

function SetListOfLevels(Index)
{
   Version = $('#Version'+Index).val();
   Algorithm = $('#Algorithm'+Index).val();

   if(CheckAvailable(Version, Algorithm) == false)
      FetchVersion(Version, Algorithm);

   UniqueValues(FindRecord(Version, Algorithm, "NoMatch", "NoMatch", "NoMatch"),
      "Level", $('#Level'+Index));
   SetListOfDependencies(Index);
}

function SetListOfDependencies(Index)
{
   Version = $('#Version'+Index).val();
   Algorithm = $('#Algorithm'+Index).val();
   Level = $('#Level'+Index).val();
   UniqueValues(FindRecord(Version, Algorithm, Level, "NoMatch", "NoMatch"),
      "Dependency", $('#Dependency'+Index));
   SetListOfSelections(Index);
}

function SetListOfSelections(Index)
{
   Version = $('#Version'+Index).val();
   Algorithm = $('#Algorithm'+Index).val();
   Level = $('#Level'+Index).val();
   Dependency = $('#Dependency'+Index).val();
   UniqueValues(FindRecord(Version, Algorithm, Level, Dependency, "NoMatch"),
      "Selection", $('#Selection'+Index));
}

function VersionChange(Index)    { SetListOfAlgorithms(Index);   UpdateCurves(); UpdateHash(); }
function AlgorithmChange(Index)  { SetListOfLevels(Index);       UpdateCurves(); UpdateHash(); }
function LevelChange(Index)      { SetListOfDependencies(Index); UpdateCurves(); UpdateHash(); }
function DependencyChange(Index) { SetListOfSelections(Index);   UpdateCurves(); UpdateHash(); }
function SelectionChange(Index)  {                               UpdateCurves(); UpdateHash(); }

function CheckAvailable(Version, Algorithm)
{
   for(Index in AvailableList)
   {
      if(AvailableList[Index]["Version"] == Version && AvailableList[Index]["Algorithm"] == Algorithm)
         return true;
   }
   return false;
}

function CheckInProgress(Version, Algorithm)
{
   for(Index in InProgressList)
   {
      if(InProgressList[Index]["Version"] == Version && InProgressList[Index]["Algorithm"] == Algorithm)
         return true;
   }
   return false;
}

function SetSingleOption(Item, Value)
{
   Item.empty();
   Item.append("<option value = \"" + Value + "\">" + Value + "</option>");
}

function FetchVersion(Version, Algorithm)
{
   if(CheckAvailable(Version, Algorithm) == true)
      return;

   console.log('Fetching ' + Version + ' + ' + Algorithm);

   if(CheckInProgress(Version, Algorithm) == true)
      return;

   InProgressList.push({"Version": Version, "Algorithm": Algorithm});

   URLBase = 'https://cmsjetmettools.web.cern.ch/cmsjetmettools/JECViewerDevelopment/Fragments/';
   $.getJSON(URLBase + 'JSON_' + Version + "_" + Algorithm + ".json", function(data)
   {
      // console.log(data);
      Data = Data.concat(data);
      AvailableList.push({"Version": Version, "Algorithm": Algorithm});
      InProgressList = InProgressList.filter(function(item)
      {
         if(item["Version"] == Version && item["Algorithm"] == Algorithm)
            return false;
         return true;
      });
      RemovePlaceholder(Version, Algorithm);
      HideUnhideCurve(Version, Algorithm, false);
      RefreshList();
      setTimeout(function(){UpdateCurves()}, AnimationTime);
   });
}

function FetchVersionOnly(Version, Algorithm)
{
   if(CheckAvailable(Version, Algorithm) == true)
      return;

   console.log('Fetching ' + Version + ' + ' + Algorithm);

   if(CheckInProgress(Version, Algorithm) == true)
      return;

   InProgressList.push({"Version": Version, "Algorithm": Algorithm});

   URLBase = 'https://cmsjetmettools.web.cern.ch/cmsjetmettools/JECViewerDevelopment/Fragments/';
   $.getJSON(URLBase + 'JSON_' + Version + "_" + Algorithm + ".json", function(data)
   {
      Data = Data.concat(data);
      AvailableList.push({"Version": Version, "Algorithm": Algorithm});
      InProgressList = InProgressList.filter(function(item)
      {
         if(item["Version"] == Version && item["Algorithm"] == Algorithm)
            return false;
         return true;
      });
      RemovePlaceholder(Version, Algorithm);
   });
}

function RemovePlaceholder(Version, Algorithm)
{
   Data = Data.filter(function(item)
   {
      if(item["Version"] == Version && item["Algorithm"] == Algorithm)
         if("Placeholder" in item && item["Placeholder"] == true)
            return false;
      return true;
   });
}

function RefreshList()
{
   var CurveCount = parseInt($("#CurveCount").val());
   for(var Index = 0; Index < CurveCount; Index = Index + 1)
      VersionChange(Index + 1);
}
      
function HideUnhideCurve(TargetVersion, TargetAlgorithm, Hide)
{
   var CurveCount = parseInt($("#CurveCount").val());
   for(Index = 0; Index < CurveCount; Index++)
   {
      ItemVersion    = $('#Version'+(Index+1)).val();
      ItemAlgorithm  = $('#Algorithm'+(Index+1)).val();
   
      if(ItemVersion != TargetVersion)
         continue;
      if(ItemAlgorithm != TargetAlgorithm)
         continue;

      if(Hide == true)
         $('#Color'+(Index+1)).addClass('hide');
      else
         $('#Color'+(Index+1)).removeClass('hide');
   }
}

function GetXY()
{
   var CurveCount = parseInt($("#CurveCount").val());

   Xs = [];
   Ys = [];
   XMin = 999;
   XMax = -999;
   YMin = 999;
   YMax = -999;

   XMode = "";
   YMode = "";
   if($('#LogX').hasClass("On"))   XMode = "log";
   if($('#LogY').hasClass("On"))   YMode = "log";

   for(Index = 0; Index < CurveCount; Index++)
   {
      if($('#Color'+(Index+1)).hasClass('hide'))
         continue;
      
      Version    = $('#Version'+(Index+1)).val();
      Algorithm  = $('#Algorithm'+(Index+1)).val();
      Level      = $('#Level'+(Index+1)).val();
      Dependency = $('#Dependency'+(Index+1)).val();
      Selection  = $('#Selection'+(Index+1)).val();

      Item = FindRecord(Version, Algorithm, Level, Dependency, Selection);
      if(Item.length == 0)
         continue;

      Xs.push(Item[0].Dependency);
      Ys.push(Item[0].YLabel);

      N = Item[0].X.length;
      for(i = 0; i < N; i++)
      {
         if(XMode == "log")
         {
            if(Item[0].X[i] > 0)
               if(Item[0].X[i] < XMin)
                  XMin = Item[0].X[i];
         }
         else
         {
            if(Item[0].X[i] < XMin)
               XMin = Item[0].X[i];
         }
         if(Item[0].X[i] > XMax)
            XMax = Item[0].X[i];

         if(YMode == "log")
         {
            if(Item[0].Y[i] > 0)
               if(Item[0].Y[i] < YMin)
                  YMin = Item[0].Y[i];
         }
         else
         {
            if(Item[0].Y[i] < YMin)
               YMin = Item[0].Y[i];
         }
         if(Item[0].Y[i] > YMax)
            YMax = Item[0].Y[i];
      }
   }

   DataXMin = XMin;
   DataXMax = XMax;
   DataYMin = YMin;
   DataYMax = YMax;

   if(XMode == "")
   {
      DX = XMax - XMin;
      if(XMin != 0)
         XMin = XMin - DX * 0.05;
      XMax = XMax + DX * 0.05;
   }
   else
   {
      DX = Math.log(XMax) - Math.log(XMin);
      if(XMax / XMin < 10)
         DX = Math.log(10);
      XMin = XMin / Math.exp(DX * 0.05);
      XMax = XMax * Math.exp(DX * 0.05);
   }

   if(YMode == "")
   {
      DY = YMax - YMin;
      if(YMin != 0)
         YMin = YMin - DY * 0.05;
      YMax = YMax + DY * 0.05;
   }
   else
   {
      DY = Math.log(YMax) - Math.log(YMin);
      if(YMax / YMin < 10)
      {
         DY = Math.log(10);
         YMax = YMax * Math.exp(DY * 0.05);
         YMin = YMin / Math.exp(DY * 0.05);
      }
      else
      {
         YMin = YMin / Math.exp(DY * 0.05);
         YMax = YMax * Math.exp(DY * 0.05);
      }
   }

   Xs = Xs.filter(function(value, index, self) {return self.indexOf(value) == index;});
   Ys = Ys.filter(function(value, index, self) {return self.indexOf(value) == index;});

   XLabel = '';
   for(i = 0; i < Xs.length; i++)
   {
      if(i != 0)
         XLabel += ',';
      XLabel += Xs[i];
   }
   YLabel = '';
   for(i = 0; i < Ys.length; i++)
   {
      if(i != 0)
         YLabel += ',';
      YLabel += Ys[i];
   }

   return {X: XLabel, Y: YLabel, XMin: XMin, XMax: XMax, YMin: YMin, YMax: YMax, XMode: XMode, YMode: YMode, DataXMin: DataXMin, DataXMax: DataXMax, DataYMin: DataYMin, DataYMax: DataYMax};
}

function UpdateCurves()
{
   if(CurveUpdateLock == true)
      return;

   // Set up plotting related stuff

   var CurveCount = $("#CurveCount").val();

   for(Index = 0; Index < CurveCount; Index++)
   {
      Version    = $('#Version'+(Index+1)).val();
      Algorithm  = $('#Algorithm'+(Index+1)).val();
      Level      = $('#Level'+(Index+1)).val();
      Dependency = $('#Dependency'+(Index+1)).val();
      Selection  = $('#Selection'+(Index+1)).val();
      Item = FindRecord(Version, Algorithm, Level, Dependency, Selection);
      if(Item.length == 0)
         continue;
      if("Placeholder" in Item[0] && Item[0]["Placeholder"] == true)
         $('#Color'+(Index+1)).addClass('hide');
   }

   XY = GetXY();

   var PlotOption =
   {
      xaxis:     {axisLabel: XY.X, min: XY.XMin, max: XY.XMax,
         datamin: XY.DataXMin, datamax: XY.DataXMax, mode: XY.XMode},
      yaxis:     {axisLabel: XY.Y, min: XY.YMin, max: XY.YMax,
         datamin: XY.DataYMin, datamax: XY.DataYMax, mode: XY.YMode},
      grid:      {margin: 25, hoverable: true, clickable: true,
         borderWidth: 1, borderColor: '#DDD', labelMargin: 10, axisMargin: 10,
         backgroundColor: null, autoHighlight: false},
      crosshair: {mode: "xy", color: "rgba(0,0,0,0.5)", lineWidth: 1},
      selection: {mode: "xy", color: "#FBF"}
   };
   if(XY.XMode == "log")
   {
      PlotOption.xaxis["transform"] = function(v) {return v > 0 ? Math.log(v) / Math.LN10 : null;};
      PlotOption.xaxis["inverseTransform"] = function(v) {return Math.pow(10, v);};
   }
   if(XY.YMode == "log")
   {
      PlotOption.yaxis["transform"] = function(v) {return (v > 0) ? Math.log(v) / Math.LN10 : null;};
      PlotOption.yaxis["inverseTransform"] = function(v) {return Math.pow(10, v);};
   }
   PlotOption["legend"] =
   {
      show: true,
      position: "ne",
      labelBoxBorderColor: '#FFF',
      backgroundColor: '#FFF',
      backgroundOpacity: 0.5,
      noColumns: 2,
      margin: 10
   }

   PlotData = [];

   for(Index = 0; Index < CurveCount; Index++)
   {
      if($('#Color'+(Index+1)).hasClass('hide'))
         continue;

      Version    = $('#Version'+(Index+1)).val();
      Algorithm  = $('#Algorithm'+(Index+1)).val();
      Level      = $('#Level'+(Index+1)).val();
      Dependency = $('#Dependency'+(Index+1)).val();
      Selection  = $('#Selection'+(Index+1)).val();

      Item = FindRecord(Version, Algorithm, Level, Dependency, Selection);
      if(Item.length == 0)
         continue;

      N = Item[0]["X"].length;

      var DataSeries = [];
      for(i = 0; i < N; i++)
      {
         if("EX" in Item[0])
            DataSeries.push([Item[0].X[i], Item[0].Y[i], Item[0].EX[i], Item[0].EX[i], 0, 0]);
         else
            DataSeries.push([Item[0].X[i], Item[0].Y[i], 0, 0, 0, 0]);
      }

      var Label = Version + "<br />"
         + Algorithm + ", " + Level + " (" + Selection.replaceAll(".00", "") + ")";

      if(Item[0]["Mode"] == "Line")
         PlotData.push({color: DefaultColors[Index],
                        lines: {show: true, lineWidth: 2, fill: false},
                        points: {show: false},
                        shadowSize: 0,
                        label: Label,
                        data: DataSeries});
      else if(Item[0]["Mode"] == "Step")
         PlotData.push({color: DefaultColors[Index],
                        lines: {show: false},
                        points: {show: true, radius: 0, errorbars: "x", xerr: {show: true}},
                        shadowSize: 0,
                        label: Label,
                        data: DataSeries});
      else
         PlotData.push({color: DefaultColors[Index],
                        lines: {show: false},
                        points: {show: true, radius: 1, fillColor: DefaultColors[Index]},
                        shadowSize: 0,
                        label: Label,
                        data: DataSeries});
   }

   if(PlotData.length == 0 && OldPlotDataLength == 0)
   {
      $('#ChartDiv').stop().fadeOut(AnimationTime, function()
      {
         $('#ChartEmpty').stop().fadeIn(AnimationTime);
      });
      $('#ChartDiv').delay(AnimationTime - 1, function()
      {
         Plot = $.plot("#ChartDiv", PlotData, PlotOption);
      });
   }
   else if(PlotData.length == 0 && OldPlotDataLength > 0)
   {
      $('#ChartDiv').stop().fadeOut(AnimationTime, function()
      {
         $('#ChartEmpty').stop().fadeIn(AnimationTime);
      });
      $('#ChartDiv').delay(AnimationTime - 1, function()
      {
         Plot = $.plot("#ChartDiv", PlotData, PlotOption);
      });
   }
   else if(OldPlotDataLength == 0 && PlotData.length > 0)
   {
      $('#ChartEmpty').stop().fadeOut(AnimationTime, function()
      {
         $('#ChartDiv').stop().fadeTo(1, 0.01, function()
         {
            Plot = $.plot("#ChartDiv", PlotData, PlotOption);
         }).fadeTo(AnimationTime - 1, 1.00);
      });
   }
   else
   {
      $('#ChartEmpty').stop().fadeOut(AnimationTime, function()
      {
         if($('#ChartDiv').css('display') == 'none')
         {
            $('#ChartDiv').stop().fadeTo(1, 0.01, function()
            {
               Plot = $.plot("#ChartDiv", PlotData, PlotOption);
            }).fadeTo(AnimationTime - 1, 1.00);
         }
         else
         {
            Plot = $.plot("#ChartDiv", PlotData, PlotOption);
            $('#ChartDiv').stop().fadeTo(AnimationTime, 1.00);
         }
      });
   }

   OldPlotDataLength = PlotData.length;
}

function ResetRange()
{
   $.each(Plot.getXAxes(), function(_,axis)
   {
      var opts = axis.options;
      opts.min = XY.XMin;
      opts.max = XY.XMax;
   });
   $.each(Plot.getYAxes(), function(_,axis)
   {
      var opts = axis.options;
      opts.min = XY.YMin;
      opts.max = XY.YMax;
   });
   Plot.setupGrid();
   Plot.draw();
   Plot.clearSelection();
}

function ShowHideSelector()
{
   var CurveCount = parseInt($('#CurveCount').val());
   if(CurveCount > MaxCurveCount || CurveCount <= 0)
      CurveCount = 1;

   if(OldCurveCount > 0 && CurveCount > OldCurveCount)
   {
      CurveUpdateLock = true;
      for(var i = OldCurveCount + 1; i <= CurveCount; i++)
      {
         $('#Version'+i).val($('#Version'+(i-1)).val());
         VersionChange(i);
         $('#Algorithm'+i).val($('#Algorithm'+(i-1)).val());
         AlgorithmChange(i);
         $('#Level'+i).val($('#Level'+(i-1)).val());
         LevelChange(i);
         $('#Dependency'+i).val($('#Dependency'+(i-1)).val());
         DependencyChange(i);
         $('#Selection'+i).val($('#Selection'+(i-1)).val());
         SelectionChange(i);

         // $('#Color'+i).removeClass("hide");
      }
      CurveUpdateLock = false;
   }

   if(CurveCount < OldCurveCount)   // hide some
   {
      // var ToChange = OldCurveCount - CurveCount;
      var ToChange = CurveCount - OldCurveCount;
      var AnimationEach = AnimationTime / ToChange;
      if(AnimationEach < MinAnimationTime)
         AnimationEach = MinAnimationTime;
      for(var i = OldCurveCount - 1; i >= CurveCount; i--)
      {
         $('#Selector'+(i+1)).stop().delay(AnimationEach * (OldCurveCount - 1 - i)).fadeOut(AnimationEach);
      }
   }
   else if(CurveCount > OldCurveCount)   // show some
   {
      if(OldCurveCount < 0)
         OldCurveCount = 0;
      var ToChange = CurveCount - OldCurveCount;
      var AnimationEach = AnimationTime / ToChange;
      if(AnimationEach < MinAnimationTime)
         AnimationEach = MinAnimationTime;
      for(var i = OldCurveCount; i < CurveCount; i++)
      {
         $('#Selector'+(i+1)).css('display', "table-row").css('opacity', 0.01);
         $('#Selector'+(i+1)).stop().delay(AnimationTime).delay(AnimationEach * (i - OldCurveCount)).fadeTo(AnimationEach, 1.00);
      }
   }

   OldCurveCount = CurveCount;
}

function UpdateHash()
{
   if(HashLockdown == true)
      return;

   var HashString = "";
   var CurveCount = $('#CurveCount').val();

   for(var i = 0; i < MaxCurveCount; i++)
   {
      if(CurveCount <= i)
         continue;
      if(i != 0)
         HashString = HashString + "&";
      HashString = HashString
         + $('#Version'+(i+1)).val() + ";"
         + $('#Algorithm'+(i+1)).val() + ";"
         + $('#Level'+(i+1)).val() + ";"
         + $('#Dependency'+(i+1)).val() + ";"
         + $('#Selection'+(i+1)).val() + ";"
         + "Hidden=" + $('#Color'+(i+1)).hasClass('hide');
   }

   HashString = HashString + "?" + "LogX=" + $('#LogX').hasClass("On");
   HashString = HashString + "&" + "LogY=" + $('#LogY').hasClass("On");

   HashString = encodeURI(HashString);

   window.location.hash = HashString;
}

function PreloadFromHash(HashString)
{
   HashString = HashString.replace(/^#/, "");
   HashString = decodeURI(HashString);

   HashLockdown = true;

   if(HashString == "")
   {
      LoadDefaultSetup();
      return;
   }

   var BigSplit = HashString.split('?');

   var Curves = HashString.split('?')[0].split("&");
   var ExtraInformation = (BigSplit.length > 1) ? HashString.split('?')[1].split("&") : [];

   // Preload necessary versions
   var CurveCount = Curves.length;
   if(CurveCount > MaxCurveCount)
      CurveCount = MaxCurveCount;
   for(var i = 0; i < CurveCount; i++)
   {
      // console.log(Curves[i]);
      var Split = Curves[i].split(';');
      if(CheckAvailable(Split[0], Split[1]) == false)
         FetchVersionOnly(Split[0], Split[1]);
   }

   setTimeout(function(){LoadFromHash(HashString);}, 25);
}

function LoadFromHash(HashString)
{
   if(InProgressList.length > 0)
   {
      setTimeout(function(){LoadFromHash(HashString);}, 25);
      return;
   }

   HashString = HashString.replace(/^#/, "");
   HashString = decodeURI(HashString);

   var BigSplit = HashString.split('?');

   var Curves = HashString.split('?')[0].split("&");
   var ExtraInformation = (BigSplit.length > 1) ? HashString.split('?')[1].split("&") : [];

   var CurveCount = Curves.length;
   if(CurveCount > MaxCurveCount)
      CurveCount = MaxCurveCount;

   $('#CurveCount').val(CurveCount);

   var Error = false;

   for(var i = 0; i < MaxCurveCount; i++)
   {
      if(CurveCount <= i)
         continue;

      var Split = Curves[i].split(';');
      var Items = FindRecord(Split[0], Split[1], Split[2], Split[3], Split[4]);
      if(Items.length == 0)
      {
         console.log(Split);
         Error = true;
         break;
      }
      // else if(Items.length == 1)   // TODO: What this for?
      // {
      //    Split[4] = Items[0].Selection;
      // }
      else if(Items.length > 1)
      {
         Items = FindRecord(Split[0], Split[1], Split[2], Split[3], Splitp[4]);
         if(Items.length == 0)
         {
            console.log(Split);
            Error = true;
            break;
         }
      }

      $('#Version'+(i+1)).val(Split[0]);
      VersionChange(i + 1);
      $('#Algorithm'+(i+1)).val(Split[1]);
      AlgorithmChange(i + 1);
      $('#Level'+(i+1)).val(Split[2]);
      LevelChange(i + 1);
      $('#Dependency'+(i+1)).val(Split[3]);
      DependencyChange(i + 1);
      $('#Selection'+(i+1)).val(Split[4]);
      SelectionChange(i + 1);

      if(Split[5] == "Hidden=true")
         $('#Color'+(i+1)).addClass('hide');
      else
         $('#Color'+(i+1)).removeClass('hide');
   }

   if(Error == true)
   {
      LoadDefaultSetup();
      return;
   }

   for(var i = 0; i < ExtraInformation.length; i++)
   {
      if(ExtraInformation[i] == "LogX=false")
         $('#LogX').removeClass("On");
      if(ExtraInformation[i] == "LogX=true")
         $('#LogX').addClass("On");
      if(ExtraInformation[i] == "LogY=false")
         $('#LogY').removeClass("On");
      if(ExtraInformation[i] == "LogY=true")
         $('#LogY').addClass("On");
      if(ExtraInformation[i] == "LogX=0")
         $('#LogX').removeClass("On");
      if(ExtraInformation[i] == "LogX=1")
         $('#LogX').addClass("On");
      if(ExtraInformation[i] == "LogY=0")
         $('#LogY').removeClass("On");
      if(ExtraInformation[i] == "LogY=1")
         $('#LogY').addClass("On");
   }
   
   CurveUpdateLock = false;
   
   ShowHideSelector();
   UpdateCurves();
   UpdateHash();

   HashLockdown = false;
}

function CheckContains(Item, Value)
{
   var N = Item.children('option').length;

   for(var i = 0; i < N; i++)
      if(Item.children('option')[i].value == Value)
         return true;

   return false;
}

function SetValue(Item, Value)
{
   if(CheckContains(Item, Value))
      Item.val(Value);
   else
      Item.prop("selectedIndex", 0);
}

function LoadDefaultSetup()
{
   $('#CurveCount').val(2);

   SetValue($('#Version1'), 'Autumn18_V19_MC');            VersionChange(1);
   SetValue($('#Algorithm1'), 'AK4PFchs');                 AlgorithmChange(1);
   SetValue($('#Level1'), "L1FastJet");                    LevelChange(1);
   SetValue($('#Dependency1'), "Eta");                     DependencyChange(1);
   SetValue($('#Selection1'), "Rho = 40.00, PT = 100.00"); SelectionChange(1);

   SetValue($('#Version2'), 'Autumn18_V19_MC');            VersionChange(2);
   SetValue($('#Algorithm2'), 'AK4PFchs');                 AlgorithmChange(2);
   SetValue($('#Level2'), "L2Relative");                   LevelChange(2);
   SetValue($('#Dependency2'), "Eta");                     DependencyChange(2);
   SetValue($('#Selection2'), "Rho = 40.00, PT = 100.00"); SelectionChange(2);

   $('#LogX').removeClass("On");
   $('#LogY').addClass("On");

   CurveUpdateLock = false;
   
   ShowHideSelector();
   UpdateCurves();
   UpdateHash();
   
   HashLockdown = false;
}

function UpdateLocation()
{
   PositionTimeout = null;

   var Text = "Mouse over the plot to see coordinates";

   var Position = LatestPosition;
   var Axes = Plot.getAxes();

   if(Position.x > Axes.xaxis.min && Position.x < Axes.xaxis.max
      && Position.y > Axes.yaxis.min && Position.y < Axes.yaxis.max)
      Text = "Cursor location (" + Position.x.toPrecision(5) + ", " + Position.y.toPrecision(5) + ")";

   $('#MouseLocation').html(Text);
}

function UpdateAvailableList()
{
   if(AvailableListLock == true)
      return;

   AvailableListLock = true;

   AvailableList = [];
   for(Index in Data)
   {
      FilteredList = AvailableList.filter(function(value, index, self)
      {
         if("Placeholder" in value && value.Placeholder == true)
            return false;
         return value.Version == Data[Index]["Version"]
            && value.Algorithm == Data[Index]["Algorithm"];
      });
      if(FilteredList.length > 0)
         continue;
      AvailableList.push({Version: Data[Index]["Version"], Algorithm: Data[Index]["Algorithm"]});
   }

   AvailableListLock = false;
}

function FillPlaceHolder()
{
   for(Index in Versions)
   {
      FilteredList = AvailableList.filter(function(value, index, self)
      {
         return value.Version == Versions[Index]["Version"]
            && value.Algorithm == Versions[Index]["Algorithm"];
      });
      if(FilteredList.length > 0)
         continue;

      Data.push({
         "Version": Versions[Index].Version,
         "Algorithm": Versions[Index].Algorithm,
         "Level": "fetching...",
         "Dependency": "fetching...",
         "YLabel": "fetching...",
         "Mode": "Line",
         "Selection": "fetching...",
         "Placeholder": true,
         "X": [0],
         "Y": [0]
      });
   }
}

function BuildFileName()
{
   var LongString = '';

   var CurveCount = parseInt($('#CurveCount').val());
   for(var i = 0; i < CurveCount; i++)
   {
      if($('#Color'+(i+1)).hasClass('hide'))
         continue;

      if(LongString != '')
         LongString = LongString + "--";
      LongString = LongString
         + $('#Version'+(i+1)).val() + ","
         + $('#Algorithm'+(i+1)).val() + ","
         + $('#Level'+(i+1)).val() + ","
         + $('#Dependency'+(i+1)).val() + ","
         + $('#Selection'+(i+1)).val().replaceAll(' ', '').replaceAll('.00', '');
   }

   return LongString;
}

function Initialize()
{
   console.log('starting initialize function');

   CurveUpdateLock = true;
   HashLockdown = false;

   AvailableListLock = false;
   UpdateAvailableList();
   FillPlaceHolder();

   var Keyword = ['Version', 'Algorithm', 'Level', 'Dependency', 'Selection'];

   for(i = 1; i <= MaxCurveCount; i++)
   {
      SelectorTR = "";
      SelectorTR += '<tr class="SelectorLine" id="Selector' + i + '" style="display: none;">';
      SelectorTR += '   <td><div class="color" id="Color' + i + '" title="Show/Hide"></td>';
      for(j = 0; j < Keyword.length; j++)
         SelectorTR += '   <td><span class="SelectorLabel">' + Keyword[j] + '</span></td>'
            + '<td><select id="' + Keyword[j] + i + '"></select></td>';
      SelectorTR += '</tr>';
      $('div.SelectorTableContainer > table').append(SelectorTR);

      $('#Selector'+i+' select').attr("Index", i);
      $('#Selector'+i+' select').css('border-color', DefaultColors[i-1]);
      
      $('#Color'+i).css('background-color', DefaultColors[i-1]);
      $('#Color'+i).css('border-color', DefaultColors[i-1]);
      $('#Version'+i)   .change(function(){VersionChange($(this).attr("Index"));});
      $('#Algorithm'+i) .change(function(){AlgorithmChange($(this).attr("Index"));});
      $('#Level'+i)     .change(function(){LevelChange($(this).attr("Index"));});
      $('#Dependency'+i).change(function(){DependencyChange($(this).attr("Index"));});
      $('#Selection'+i) .change(function(){SelectionChange($(this).attr("Index"));});

      $('#Color'+i).click(function(){$(this).toggleClass('hide'); UpdateCurves(); UpdateHash();});

      SetListOfVersions(i);
   }

   PreloadFromHash(window.location.hash);

   $('#CurveCount').change(function(){ShowHideSelector(); UpdateCurves(); UpdateHash();});

   $('#ChartDiv').bind("plotselected", function(event, ranges)
   {
      $.each(Plot.getXAxes(), function(_,axis)
      {
         var opts = axis.options;
         opts.min = ranges.xaxis.from;
         opts.max = ranges.xaxis.to;
      });
      $.each(Plot.getYAxes(), function(_,axis)
      {
         var opts = axis.options;
         opts.min = ranges.yaxis.from;
         opts.max = ranges.yaxis.to;
      });
      Plot.setupGrid();
      Plot.draw();
      Plot.clearSelection();
   });
   $('#ChartDiv').bind("plothover", function(event, pos, item)
   {
      LatestPosition = pos;
      if(PositionTimeout == null)
         PositionTimeout = setTimeout(UpdateLocation, 50);
   });

   $('#LogX').click(function(){$(this).toggleClass("On"); UpdateCurves(); UpdateHash();});
   $('#LogY').click(function(){$(this).toggleClass("On"); UpdateCurves(); UpdateHash();});

   $('#ChartDiv').bind("contextmenu", function(){ResetRange(); return false;});
   $('#ZoomOutButton').click(function() {ResetRange();});

   $('#DownloadButton').click(function(e)
   {
      e.preventDefault();
      html2canvas($('#ChartDiv')[0]).then(canvas =>
      {
         document.body.appendChild(canvas);
         
         var Width = $('#ChartDiv').width() / 96.0;
         var Height = $('#ChartDiv').height() / 96.0;
         var PdfFile = new jsPDF(
         {
            orientation: 'landscape',
            unit: 'in',
            format: [Width, Height],
            compressPdf: true
         });
         PdfFile.addImage(
         {
            imageData: canvas.toDataURL("image/png"),
            x: 0,
            y: 0,
            compression: 'SLOW',
            scrollX: 0,
            scrollY: 0
         });
         PdfFile.save('JECChart--' + BuildFileName() + '.pdf');

         document.body.removeChild(canvas);
      });
   });
}

$(window).on('load', Initialize);



