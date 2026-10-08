/* Couch To Front Office: data tables for the realistic NHL Draft module (draft.js).
   Name pools, leagues and club lists feed the fictional generator for draft classes the
   bundled real-class files don't cover. Real classes are in data/draft-classes.js. */
(function(){
'use strict';
var T={};
T.NATIONS=[ // ISO3, weight (share of draft-eligible pool), display name
 ['CAN',36,'Canada'],['USA',26,'USA'],['SWE',10,'Sweden'],['FIN',6,'Finland'],['RUS',7,'Russia'],['CZE',4.5,'Czechia'],
 ['SVK',2.5,'Slovakia'],['SUI',2,'Switzerland'],['GER',1.6,'Germany'],['LAT',0.9,'Latvia'],['NOR',0.6,'Norway'],
 ['DEN',0.6,'Denmark'],['AUT',0.5,'Austria'],['BLR',0.5,'Belarus'],['KAZ',0.3,'Kazakhstan']];
T.LEAGUE_BY_NATION={ // league code, weight
 CAN:[['OHL',36],['WHL',30],['QMJHL',17],['BCHL',5],['USHL',5],['NCAA',4],['USHS',3]],
 USA:[['NTDP',26],['USHL',36],['NCAA',10],['USHS',9],['OHL',9],['WHL',7],['QMJHL',3]],
 SWE:[['J20',55],['SHL',18],['ALLSV',12],['CHL',9],['USHL',6]],
 FIN:[['U20SM',55],['LIIGA',24],['MESTIS',5],['CHL',10],['USHL',6]],
 RUS:[['MHL',55],['KHL',14],['VHL',6],['CHL',20],['USHL',5]],
 CZE:[['CZU20',35],['ELH',25],['CHL',35],['USHL',5]],
 SVK:[['SVK',30],['CZU20',15],['CHL',30],['J20',20],['USHL',5]],
 SUI:[['SUIU20',45],['NL',25],['CHL',25],['USHL',5]],
 GER:[['DNL',40],['DEL',25],['CHL',30],['USHL',5]],
 LAT:[['J20',25],['U20SM',15],['CHL',40],['USHL',10],['MHL',10]],
 NOR:[['J20',40],['NOR',20],['CHL',30],['USHL',10]],
 DEN:[['J20',40],['DEN',20],['CHL',30],['USHL',10]],
 AUT:[['SUIU20',20],['DNL',20],['ICEHL',20],['CHL',30],['USHL',10]],
 BLR:[['MHL',45],['KHL',15],['CHL',30],['USHL',10]],
 KAZ:[['MHL',55],['KHL',15],['CHL',20],['USHL',10]]};
// type: CHL, NCAA, NCAA_BOUND (USHL/NTDP/USHS/BCHL), EURO_JR, EURO_PRO
T.LEAGUES={
 OHL:{name:'OHL',type:'CHL',ppg:[0.32,1.30],gp:[56,68]},
 WHL:{name:'WHL',type:'CHL',ppg:[0.32,1.30],gp:[56,68]},
 QMJHL:{name:'QMJHL',type:'CHL',ppg:[0.32,1.32],gp:[52,64]},
 USHL:{name:'USHL',type:'NCAA_BOUND',ppg:[0.25,1.15],gp:[44,60]},
 NTDP:{name:'USNTDP',type:'NCAA_BOUND',ppg:[0.25,1.20],gp:[50,62]},
 USHS:{name:'USHS-Prep',type:'NCAA_BOUND',ppg:[0.6,1.9],gp:[25,35]},
 BCHL:{name:'BCHL',type:'NCAA_BOUND',ppg:[0.35,1.25],gp:[45,54]},
 NCAA:{name:'NCAA',type:'NCAA',ppg:[0.15,1.00],gp:[26,38]},
 J20:{name:'J20 Nationell',type:'EURO_JR',ppg:[0.35,1.35],gp:[28,44]},
 SHL:{name:'SHL',type:'EURO_PRO',ppg:[0.03,0.45],gp:[18,50]},
 ALLSV:{name:'HockeyAllsvenskan',type:'EURO_PRO',ppg:[0.08,0.60],gp:[20,50]},
 U20SM:{name:'U20 SM-sarja',type:'EURO_JR',ppg:[0.35,1.35],gp:[28,44]},
 LIIGA:{name:'Liiga',type:'EURO_PRO',ppg:[0.03,0.50],gp:[18,56]},
 MESTIS:{name:'Mestis',type:'EURO_PRO',ppg:[0.10,0.65],gp:[20,44]},
 MHL:{name:'MHL',type:'EURO_JR',ppg:[0.30,1.30],gp:[30,56]},
 KHL:{name:'KHL',type:'EURO_PRO',ppg:[0.02,0.40],gp:[14,50]},
 VHL:{name:'VHL',type:'EURO_PRO',ppg:[0.08,0.55],gp:[16,44]},
 CZU20:{name:'Czechia U20',type:'EURO_JR',ppg:[0.40,1.40],gp:[24,40]},
 ELH:{name:'Czech Extraliga',type:'EURO_PRO',ppg:[0.04,0.45],gp:[18,50]},
 SVK:{name:'Slovakia',type:'EURO_PRO',ppg:[0.08,0.60],gp:[20,50]},
 SUIU20:{name:'U20-Elit',type:'EURO_JR',ppg:[0.40,1.40],gp:[22,40]},
 NL:{name:'National League',type:'EURO_PRO',ppg:[0.03,0.45],gp:[18,50]},
 DNL:{name:'DNL U20',type:'EURO_JR',ppg:[0.45,1.60],gp:[24,40]},
 DEL:{name:'DEL',type:'EURO_PRO',ppg:[0.03,0.40],gp:[18,50]},
 NOR:{name:'EliteHockey Ligaen',type:'EURO_PRO',ppg:[0.10,0.70],gp:[20,45]},
 DEN:{name:'Metal Ligaen',type:'EURO_PRO',ppg:[0.10,0.70],gp:[20,45]},
 ICEHL:{name:'ICE Hockey League',type:'EURO_PRO',ppg:[0.05,0.55],gp:[20,48]}};
T.TEAMS={
 OHL:['London Knights','Kitchener Rangers','Saginaw Spirit','Ottawa 67\'s','Oshawa Generals','Windsor Spitfires','Sault Ste. Marie Greyhounds','Brantford Bulldogs','Barrie Colts','Sudbury Wolves','Peterborough Petes','Kingston Frontenacs','Erie Otters','Flint Firebirds','Owen Sound Attack','Guelph Storm','Brampton Steelheads','Sarnia Sting','North Bay Battalion','Niagara IceDogs'],
 WHL:['Medicine Hat Tigers','Everett Silvertips','Portland Winterhawks','Spokane Chiefs','Saskatoon Blades','Prince Albert Raiders','Calgary Hitmen','Kelowna Rockets','Vancouver Giants','Brandon Wheat Kings','Moose Jaw Warriors','Regina Pats','Edmonton Oil Kings','Lethbridge Hurricanes','Red Deer Rebels','Seattle Thunderbirds','Tri-City Americans','Wenatchee Wild','Victoria Royals','Kamloops Blazers','Prince George Cougars','Swift Current Broncos'],
 QMJHL:['Moncton Wildcats','Rimouski Oceanic','Drummondville Voltigeurs','Baie-Comeau Drakkar','Chicoutimi Sagueneens','Sherbrooke Phoenix','Halifax Mooseheads','Saint John Sea Dogs','Gatineau Olympiques','Rouyn-Noranda Huskies','Val-d\'Or Foreurs','Victoriaville Tigres','Quebec Remparts','Charlottetown Islanders','Blainville-Boisbriand Armada','Shawinigan Cataractes','Cape Breton Eagles'],
 USHL:['Sioux City Musketeers','Muskegon Lumberjacks','Waterloo Black Hawks','Youngstown Phantoms','Chicago Steel','Fargo Force','Tri-City Storm','Dubuque Fighting Saints','Lincoln Stars','Green Bay Gamblers','Des Moines Buccaneers','Cedar Rapids RoughRiders','Madison Capitols','Omaha Lancers','Sioux Falls Stampede'],
 NTDP:['U.S. National U18 Team'],
 USHS:['Shattuck-St. Mary\'s','Edina High','Hill-Murray','St. Andrew\'s College','Mount St. Charles','Culver Academy','Northwood School','Avon Old Farms','Salisbury School','Warroad High'],
 BCHL:['Penticton Vees','Surrey Eagles','Chilliwack Chiefs','Brooks Bandits','Okotoks Oilers','Salmon Arm Silverbacks','Langley Rivermen','Cranbrook Bucks'],
 NCAA:['Boston University','Boston College','Michigan','Michigan State','Minnesota','North Dakota','Denver','Wisconsin','Notre Dame','Providence','Penn State','Western Michigan','Quinnipiac','Cornell','Harvard','UMass','Maine','Arizona State','Minnesota Duluth','St. Cloud State','Ohio State','Colorado College','Omaha','Northeastern','UConn'],
 SHL:['Frolunda HC','Farjestad BK','Skelleftea AIK','Lulea HF','Rogle BK','Djurgardens IF','HV71','Vaxjo Lakers','Malmo Redhawks','Linkoping HC','Orebro HK','Brynas IF','Timra IK','Leksands IF'],
 ALLSV:['AIK','MoDo Hockey','Mora IK','Sodertalje SK','BIK Karlskoga','IK Oskarshamn','Vasteras IK','Almtuna IS'],
 LIIGA:['Tappara','Ilves','Karpat','TPS','HIFK','Lukko','Pelicans','KalPa','JYP','SaiPa','Assat','HPK','KooKoo','Sport','Jukurit'],
 MESTIS:['Kiekko-Espoo','IPK','Jokipojat','KeuPa HT'],
 KHL:['SKA St. Petersburg','CSKA Moscow','Lokomotiv Yaroslavl','Ak Bars Kazan','Avangard Omsk','Metallurg Magnitogorsk','Dynamo Moscow','Traktor Chelyabinsk','Salavat Yulaev Ufa','Torpedo Nizhny Novgorod','Spartak Moscow','Severstal Cherepovets'],
 MHL:['SKA-1946','Krasnaya Armiya','Loko Yaroslavl','Irbis Kazan','Omskie Yastreby','Stalnye Lisy','MHK Dynamo Moscow','Belye Medvedi','Tolpar Ufa','Chaika Nizhny Novgorod','MHK Spartak','Almetyevsk Reaktor'],
 VHL:['SKA-Neva','Zvezda Moscow','Dynamo St. Petersburg','Khimik Voskresensk'],
 CZU20:['HC Sparta Praha U20','HC Ocelari Trinec U20','HC Dynamo Pardubice U20','Bili Tygri Liberec U20','HC Kometa Brno U20','HC Vitkovice U20','Mountfield HK U20'],
 ELH:['HC Sparta Praha','HC Ocelari Trinec','HC Dynamo Pardubice','Bili Tygri Liberec','HC Kometa Brno','HC Vitkovice Ridera','Mountfield HK','HC Energie Karlovy Vary'],
 SVK:['HC Slovan Bratislava','HC Kosice','HK Nitra','HC 05 Banska Bystrica','HK Poprad'],
 SUIU20:['ZSC Lions U20','HC Davos U20','EV Zug U20','SC Bern U20','Geneve-Servette U20','HC Lugano U20','Lausanne HC U20','EHC Kloten U20'],
 NL:['ZSC Lions','HC Davos','EV Zug','SC Bern','Geneve-Servette HC','HC Lugano','Lausanne HC','EHC Biel-Bienne','HC Fribourg-Gotteron'],
 DNL:['Jungadler Mannheim','EHC Red Bull Munchen U20','Kolner EC U20','Eisbaren Juniors Berlin'],
 DEL:['Eisbaren Berlin','Adler Mannheim','EHC Red Bull Munchen','Kolner Haie','ERC Ingolstadt'],
 NOR:['Storhamar','Frisk Asker','Valerenga','Stavanger Oilers'],
 DEN:['Rungsted Seier Capital','Herning Blue Fox','Aalborg Pirates'],
 ICEHL:['EC Red Bull Salzburg','EC KAC','Vienna Capitals']};
T.TEAMS.J20=T.TEAMS.SHL.slice(0,10).map(function(x){return x+' J20';});
T.TEAMS.U20SM=T.TEAMS.LIIGA.slice(0,10).map(function(x){return x+' U20';});
T.CHL=['OHL','WHL','QMJHL'];
var N={};
N.CAN={f:['Liam','Noah','Owen','Carter','Logan','Brayden','Jake','Ethan','Tyler','Cole','Mason','Hunter','Nolan','Riley','Connor','Ryan','Dylan','Jack','Lucas','Matthew','Cameron','Evan','Kaden','Easton','Brody','Gavin','Jaxon','Landon','Michael','Sam','Ben','Callum','Caleb','Porter','Tanner','Quinn','Reid','Max','Parker','Wyatt'],
 l:['MacDonald','Campbell','Fraser','Gagnon','Thompson','Robertson','McKenzie','Sinclair','Wilson','Kowalchuk','Stewart','Bennett','Hughes','Morrison','Cormier','Ferguson','Henderson','McLean','Gillis','Parsons','Leclair','Dumont','Reimer','Bauer','Pelletier','Murray','Walsh','Kozak','Harris','Lambert','Graham','Turcotte','Doucette','Mackie','Poirier','Lindgren','Halvorsen','Danyluk','Petrie','Burke','Moffat','Rasmussen','Beaulieu','Kaminski','Cardinal','Wiebe','Friesen','Penner','Chartrand']};
N.QUE={f:['Alexis','Mathis','Zachary','William','Felix','Olivier','Thomas','Samuel','Xavier','Justin','Antoine','Raphael','Gabriel','Nathan','Maxime','Loic','Vincent','Jeremy','Emile','Charles'],
 l:['Tremblay','Gagnon','Roy','Cote','Bouchard','Gauthier','Morin','Lavoie','Fortin','Gagne','Ouellet','Pelletier','Belanger','Levesque','Bergeron','Leblanc','Paquette','Girard','Simard','Boucher','Caron','Beaudoin','Cloutier','Dubois','Poulin','Lapointe','Hebert','Desrosiers','Theriault','Villeneuve']};
N.USA={f:['Jack','Will','Cole','Gavin','Brendan','Charlie','Teddy','Mac','Hudson','Luke','Ryan','Danny','Bobby','Tommy','Sean','Drew','Chase','Cooper','Blake','Brock','Trey','Grant','Colin','Kieran','Joey','Ty','Owen','Henry','Finn','Jimmy','Cam','Nick','Zeke','Austin','Brady','Tate','Beckett','Jett','Kaz','Miles'],
 l:['Sullivan','Murphy','O\'Brien','Johnson','Anderson','Nelson','Peterson','Larson','Schmidt','Miller','Doyle','Walsh','Kelly','McCarthy','Gallagher','Brennan','Hanson','Olson','Carlson','Fitzgerald','Kennedy','Ryan','Dunn','Novak','Wojcik','Hartman','Becker','Ellis','Rooney','Moran','Garrity','Barrett','Halloran','Keane','Ostrowski','Shea','Donovan','Callahan','Healey','Brandt','Lindquist','Sorensen','Kaplan','Morrow','Fleming','Duffy','Quinlan','Mahoney','Reinke']};
N.SWE={f:['Elias','Oscar','Lucas','William','Hugo','Alexander','Viktor','Filip','Isak','Axel','Anton','Liam','Emil','Albin','Ludvig','Oliver','Linus','Jonathan','Melvin','Theo','Gustav','Noel','Leo','Vincent','Adam','Malte','Otto','Sixten','Ebbe','Hampus'],
 l:['Hallberg','Ahlstrom','Blomqvist','Dahlgren','Fransson','Hellberg','Isaksson','Jonsson','Lindahl','Molin','Andersson','Johansson','Karlsson','Nilsson','Eriksson','Larsson','Olsson','Persson','Svensson','Gustafsson','Pettersson','Lindberg','Lindqvist','Holmberg','Wallin','Bergstrom','Sundqvist','Nordstrom','Lindgren','Ostlund','Wahlberg','Engstrom','Bjork','Sjoberg']};
N.FIN={f:['Aleksi','Eetu','Joonas','Kasper','Konsta','Lauri','Mikko','Niko','Oliver','Otto','Rasmus','Santeri','Topi','Veeti','Ville','Aatu','Eemil','Jesse','Leevi','Onni','Elmeri','Juho','Tuomas','Arttu','Kalle'],
 l:['Virta','Kivela','Laakso','Manninen','Rautio','Leppanen','Hamalainen','Kettunen','Mattila','Seppala','Niskanen','Hirvonen','Turunen','Lahtinen','Korhonen','Virtanen','Makinen','Nieminen','Hakkarainen','Koskinen','Jarvinen','Lehtonen','Salminen','Heinonen','Saarinen','Tuominen','Pesonen']};
N.RUS={f:['Ivan','Matvei','Artyom','Nikita','Kirill','Daniil','Maxim','Alexander','Dmitri','Egor','Ilya','Mikhail','Sergei','Andrei','Vladislav','Yaroslav','Timur','Gleb','Roman','Pavel','Semyon','Arseni','Fyodor','Lev','Denis'],
 l:['Ivanov','Smirnov','Kuznetsov','Popov','Sokolov','Lebedev','Kozlov','Novikov','Morozov','Volkov','Solovyov','Vasiliev','Zaitsev','Pavlov','Semyonov','Golubev','Vinogradov','Bogdanov','Vorobyov','Fyodorov','Belov','Komarov','Orlov','Kiselyov','Makarov','Andreyev','Kovalyov','Ilyin','Gusev','Titov','Kuzmin','Kudryavtsev','Baranov','Kulikov']};
N.CZE={f:['Jakub','Matej','Tomas','David','Adam','Filip','Ondrej','Vojtech','Lukas','Jan','Dominik','Stanislav','Michal','Radim','Petr','Marek','Daniel','Eduard','Matyas','Simon'],
 l:['Novak','Svoboda','Dvorak','Cerny','Prochazka','Kucera','Vesely','Horak','Nemec','Pokorny','Marek','Pospisil','Hajek','Jelinek','Kral','Ruzicka','Benes','Sedlak','Dolezal','Zeman','Kolar','Navratil','Cermak','Vanek']};
N.SVK={f:['Juraj','Samuel','Adam','Dalibor','Filip','Martin','Tomas','Simon','Matej','Peter','Michal','Jakub','Marek','Lukas','Patrik'],
 l:['Bartos','Duris','Gregor','Hlavaj','Kollar','Liptak','Mikula','Ondrus','Strelec','Turan','Zelenak','Horvath','Kovac','Varga','Toth','Nagy','Balaz','Molnar','Nemec','Sykora','Pospisil','Lukac','Kral']};
N.SUI={f:['Nico','Noah','Luca','Jonas','Fabian','Gian','Lian','Nils','Sandro','Timo','Dario','Yannick','Lars','Leon','Mattia','Joel','Kevin','Lorenzo','Rafael','Elia'],
 l:['Ammann','Wyss','Steiner','Graf','Kunz','Roth','Suter','Egli','Hofmann','Gasser','Muller','Meier','Schmid','Keller','Weber','Huber','Fischer','Gerber','Brunner','Baumann','Frei','Zimmermann','Moser','Bachmann','Lehmann','Rohrer']};
N.GER={f:['Lukas','Leon','Finn','Jonas','Moritz','Niklas','Tim','Julian','Tobias','Felix','Maximilian','Paul','Elias','Simon','Luis','Ben','Florian','Kilian','Jakob','Marc'],
 l:['Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Richter','Klein','Wolf','Schroder','Neumann','Braun','Zimmermann','Kruger','Hartmann','Lange','Werner','Muller']};
N.LAT={f:['Rodrigo','Martins','Kristians','Roberts','Rihards','Dans','Eriks','Arturs','Toms','Janis','Oskars','Ralfs','Gustavs','Niks','Edgars'],l:['Ozols','Liepins','Krumins','Lacis','Upitis','Zarins','Strods','Vanags','Jansons','Kalejs','Rozitis','Sproge','Ozolins','Berzins','Kalnins','Vitolins']};
N.NOR={f:['Mats','Jonas','Sander','Magnus','Henrik','Markus','Kristian','Ole','Tobias','Mathias'],l:['Berg','Dahl','Lie','Moen','Strand','Hansen','Johansen','Olsen','Larsen','Andersen','Pedersen','Nilsen','Haugen','Thoresen','Lindstrom']};
N.DEN={f:['Oliver','Mads','Frederik','Nikolaj','Jonas','Mikkel','Rasmus','Magnus','Emil','Christian'],l:['Kristensen','Poulsen','Holm','Frederiksen','Lund','Nielsen','Jensen','Hansen','Pedersen','Andersen','Christensen','Larsen','Sorensen','Rasmussen','Madsen']};
N.AUT={f:['Marco','Lukas','David','Fabian','Paul','Thomas','Simon','Julian','Vinzenz','Leon'],l:['Gruber','Huber','Bauer','Wagner','Pichler','Steiner','Moser','Mayer','Hofer','Leitner','Kasper','Thaler','Schmid']};
N.BLR={f:['Alexei','Ilya','Dmitri','Vladislav','Yegor','Danila','Maxim','Artyom','Pavel','Kirill'],l:['Novik','Marchuk','Karpenko','Hrytsenko','Lukashevich','Yermakov','Tsyrkunov','Zubko','Kovalenko','Pavlovich','Suvorov','Yakubovich','Rogovoy','Zhuk']};
N.KAZ={f:['Arsen','Timur','Daniyar','Alikhan','Nursultan','Artur','Yerlan','Sultan','Dmitri','Roman'],l:['Akhmetov','Bekov','Nurlanov','Omarov','Kassymov','Mukhametov','Iskakov','Bolatov','Zhumabekov','Savchenko']};
T.NAMES=N;
window.CTFO_DRAFT_DATA=T;
})();
