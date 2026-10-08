# Draft-stage conversation pool (authoring source for draft-questions.js).
# "## cat" sets the category. "P q" = player asks the GM; "G q" = GM asks the player, then "R reply" = his reply.
# "@ key=v1,v2" eligibility (league=CHL|NCAA|NCAA_BOUND|EURO, role=rebuild|contend|retool, pos=F|D|G, age=young|older).
# Answers: "++" strong positive, "+" moderate positive, "?" risky (depends on traits), "-" negative.
# "text | trait weights | context weights". Traits: amb loy pat col cmp fam con coa. Context: rebuild contend thin deep chl ncaa euro young older top late.

## icetime
P Will I get a real shot at camp this year?
++ Every job on this roster is open in September. Come take one. | amb+.6 cmp+.4 | rebuild+.4 thin+.3
+ You'll get a real look in camp and in preseason games, and we'll be straight with you after that. | coa+.4 loy+.3
? Camp is a measuring stick. Most kids your age go back, and that's not a bad thing. | pat+1.1 amb-1.1 con-.4
- Not this year. There are veterans ahead of you and that's how it is. | amb-.6 con-.5 | contend+.2

P Do you see me as a top-six guy down the road?
@ pos=F
++ That's exactly why we took you where we did. We see top-six hands. | amb+.5 con+.5 | top+.4
+ We think you can get there. It'll take work, but the tools are there. | coa+.5 cmp+.3
? We see a guy who can play anywhere in the lineup. Where you land is up to you. | cmp+1.0 con-.6 amb-.6
- Honestly, we project you more as a bottom-six energy guy. | amb-.8 con-.7 | late+.3

P What kind of minutes would I be looking at as a rookie?
++ If you make it, you'll play real minutes. We don't keep kids around to sit. | amb+.6 con+.3 | rebuild+.3
+ Sheltered minutes to start, then more as you earn trust. That's how we build players. | coa+.5 pat+.4
? Ice time goes to whoever's playing best that week. Nobody gets anything handed to them. | cmp+1.1 pat-.4 coa-.4
- You'd probably be the extra forward or the seventh D for a while. | amb-.8 con-.4 | contend+.2 deep+.2

P Would I be a healthy scratch a lot if I made the team?
++ No. If you're up with us, it's because you're in the lineup every night. | amb+.5 con+.4
+ Some nights, maybe, but every scratch comes with a reason and a plan. | coa+.5 pat+.3
? Probably. Watching from the press box teaches you a lot, and we'd want you up anyway. | pat+1.0 amb-1.0 cmp-.4
- We'd rather have you scratched with us than playing big minutes somewhere else. | amb-.7 con-.5 coa-.2

P Will I get time on the power play?
@ pos=F,D
++ You've got power-play vision. We want that on our second unit as soon as you're ready. | amb+.6 con+.4 | thin+.3
+ You'll get looks there in camp and in the AHL or wherever you play. We want to see it at our level. | coa+.4 cmp+.3
? Special teams are earned. Kill penalties first and see what happens. | cmp+1.0 coa+.4 amb-.8 con-.4
- Our power play is set. That's not where we see you helping us. | amb-.8 con-.6 | contend+.3 deep+.2

P Who would I be competing with for a spot?
++ Nobody you can't beat. The depth chart at your position is wide open. | amb+.5 cmp+.4 | thin+.5 rebuild+.2
+ A couple of young guys and a veteran on a one-year deal. It's a fair fight. | cmp+.5 coa+.3
? Some good players. If that scares you, you're not the guy we think you are. | cmp+1.2 con+.4 pat-.4 loy-.6
- Honestly, there are four or five guys ahead of you right now. | amb-.7 con-.5 | deep+.3

P Is there a real path for a goalie my age here?
@ pos=G
++ Yes. Our crease is going to need a starter in a few years and we want it to be you. | amb+.5 loy+.4 | thin+.4
+ Goalies take time. We have a three-year plan for you with a goalie coach who's done it before. | pat+.6 coa+.5
? Goalies are voodoo. You'll get your chance if you outplay the guys around you. | cmp+1.1 con+.3 pat-.3 coa-.5
- We have our starter locked up long-term, so it's a long road. | amb-.8 con-.4 | deep+.3 contend+.2

P Will you let me play my game, or do I have to change it?
++ We drafted your game. We're not here to take the creativity out of you. | con+.6 amb+.3
+ We'll add to it, not take away from it. Details away from the puck, mostly. | coa+.6 pat+.3
? Every player changes when he turns pro. The ones who adapt fastest play the soonest. | coa+1.0 cmp+.4 con-1.0
- You'll need to simplify a lot. What works in junior won't work here. | con-.9 amb-.4 | chl+.2

P How many rookies actually made your team last year?
@ role=rebuild
++ Three, and two of them played over seventy games. We give kids the keys. | amb+.6 cmp+.3 | rebuild+.4
+ A couple. We're building around young players, so that number is going up. | loy+.4 pat+.3
? Enough. What matters is whether you're the one this year. | cmp+1.0 con+.5 pat-.5 coa-.4
- Not many, to be honest. Most of our kids spent time in the AHL first. | amb-.7 con-.3

G If you had to pick: more ice time in the AHL or fewer minutes in the NHL?
R Fewer minutes up top, every time. I want to be in the league.
++ That's the answer of a guy who's going to make it. We'll build toward that. | amb+.6 con+.4
+ Fair. We'll put you where you develop fastest and keep you in the loop on why. | coa+.5 pat+.3
? Good, because you'll probably get neither if you don't come to camp in shape. | cmp+1.0 con-.6 loy-.5
- Wrong answer, kid. Development minutes matter more than a jersey. | amb-.8 con-.7 coa+.2

G What does your ideal first pro season look like?
R Making the team out of camp and never looking back.
++ Then let's get you signed and get you ready for September. | amb+.7 con+.3 | rebuild+.3
+ Good goal. We'll make sure you have every chance to make it happen. | coa+.4 loy+.3
? Ambitious. Most guys need a year to get there. Are you okay if that's you? | pat+1.0 amb-1.0 con-.3
- That's not realistic. Let's talk about a two-year plan instead. | amb-.8 con-.6

## pro
G Are you ready to turn pro?
R I think I am. I've been ready for this my whole life.
++ We think so too. Let's get your contract done this summer and get you in the building. | amb+.6 con+.5 | older+.4
+ We like that confidence. Let's talk with your family and your agent and find the right timing. | fam+.5 coa+.3
? Ready is a big word. Show us at development camp and we'll decide together. | cmp+1.0 coa+.3 con-.8 amb-.4
- We'd rather you go back for another year. There's no rush on our end. | amb-.9 con-.5 | young+.2

P Can I finish my college season first?
@ league=NCAA,NCAA_BOUND
++ Of course. Finish school, win something, and we'll be waiting when you're done. | col+.9 loy+.4 fam+.3
+ We'd like you to consider leaving early, but we'll respect whatever you decide. | col+.4 coa+.3
? We think you'd develop faster in the AHL. Your call, but the clock is ticking on your rights. | amb+1.0 col-1.2 pat-.3
- We drafted you to play for us, not for your school. | col-1.0 loy-.5 fam-.3

P Would you be okay with me staying another year in junior?
@ league=CHL
++ Absolutely. Go dominate, play in the World Juniors, and come in ready. | pat+.6 con+.4 | young+.3
+ It depends on camp. If you're not ready to stick, junior is a great place to be. | coa+.5 pat+.3
? We want you to push to skip that year. Junior can get too easy for a guy like you. | amb+1.1 con+.5 pat-.8
- We're not thinking about that. We want you signed and in our system. | pat-.6 fam-.3 | young-.2

G Do you see yourself staying in school all four years?
@ league=NCAA,NCAA_BOUND
R I want my degree, but I also want to play in the NHL as soon as I can.
++ That's a perfect answer. You can do both, and we'll help you plan it. | col+.6 amb+.4 coa+.3
+ We'll check in every season and decide together when the time is right. | col+.5 loy+.3 pat+.3
? Four years is a long time. We'd want you pro in two at the most. | amb+.9 col-1.1 pat-.4
- If you stay four years, we may not be the team that signs you. | col-.9 loy-.6 fam-.3

G Would you consider leaving college early to sign with us?
@ league=NCAA
R If the situation is right, yeah. I'd have to talk to my family and my coach.
++ We'd never ask you to burn bridges. When you're ready, we'll be ready with a plan. | col+.6 fam+.5 loy+.3
+ Fair. Let's keep talking through the season. We're in no hurry. | pat+.5 coa+.3
? The right situation is now. A spot like this doesn't stay open forever. | amb+1.1 cmp+.3 col-1.0 pat-.5
- We need an answer this summer, honestly. We don't want to wait. | col-.9 pat-.5 fam-.3

P Is there a chance you'd sign me right after tonight?
@ age=older
++ Yes. We want to get this done this summer and have you at camp. | amb+.6 con+.4 | older+.4
+ It's on the table. Let's get through development camp and talk numbers. | coa+.4 pat+.3
? Sign you tonight, play you next month? Slow down. Let's see the work first. | cmp+1.0 coa+.3 con-.7 amb-.5
- We're not in a rush. We hold your rights for a while. | amb-.8 con-.5 loy-.3

P Do you sign your draft picks quickly or wait them out?
++ We sign guys we believe in, and we believe in you. Expect a call from us soon. | amb+.5 loy+.4 con+.3
+ It depends on the player. With you, we'll move as fast as your development allows. | coa+.5 pat+.3
? We take our time. Some guys see that as patience, some see it as a test. | pat+1.1 cmp+.4 amb-1.0
- We usually wait. There's no reason to burn contract years early. | amb-.7 loy-.4 | contend+.2

G Junior, college or pro next year: what's your gut telling you?
R My gut says pro. I feel like I've outgrown where I am.
++ We agree. Let's give you a pro environment and see how fast you climb. | amb+.6 con+.5 | older+.3
+ That's a good instinct. We'll test it at camp and make the call with you. | coa+.5 loy+.2
? Your gut and our scouts don't agree yet. Prove us wrong. | cmp+1.2 con+.2 coa-.4 loy-.4
- Most guys who say that aren't ready. We'd rather you stay put. | con-.8 amb-.7 | young+.2

P What happens if I don't make the team out of camp?
++ Then you go back, dominate, and we bring you up the first time someone gets hurt. | amb+.4 con+.4 loy+.3
+ We'll sit down with you and explain exactly what to work on. Nobody gets left in the dark. | coa+.6 fam+.2
? Then you weren't ready. It happens to almost everyone. | pat+.9 cmp+.4 con-1.0 loy-.3
- Then you're one of fifty guys in the system. That's just how it works. | loy-.7 con-.5 fam-.3

P Can I go to the World Juniors if I sign?
@ age=young
++ Yes, a hundred percent. We'll release you, and we'll be watching every shift. | con+.4 fam+.3 loy+.3
+ If you're in junior, absolutely. If you're with us, we'll talk about it when it comes. | coa+.4 pat+.3
? If you're good enough to be in the NHL, you won't be at the World Juniors. Think about that. | amb+1.1 con+.3 fam-.6 loy-.4
- We usually don't release guys who are with the big club. | fam-.6 loy-.5 con-.3

G Are you physically ready for men's hockey?
R I've put on twelve pounds this year. I think I'm close.
++ It shows. You look ready, and our strength staff will take you the rest of the way. | con+.6 coa+.3
+ Close is good. A summer in our program and you'll be there. | coa+.6 pat+.3
? Close isn't there. The NHL eats close for breakfast. | cmp+1.1 coa+.2 con-.9 fam-.3
- Honestly, we think you need another year or two to fill out. | con-.8 amb-.6 | young+.2

## development
P What does your development staff actually do with prospects?
++ Skills coach, strength coach, video every week and a phone call from me every month. You'll never be forgotten. | coa+.5 loy+.5
+ Development camp, a summer plan and visits during the season. It's a real program. | coa+.5 pat+.3
? We give you the tools. What you do with them is up to you. | cmp+1.0 con+.4 coa-.6 loy-.5
- Most of that is handled by the AHL staff. They'll be in touch. | loy-.7 coa-.4 fam-.3

P How long do guys usually spend in your AHL affiliate?
++ The good ones? Half a season, maybe less. We don't let talent sit down there. | amb+.6 con+.4 | rebuild+.3
+ It depends on the player. A year or two is normal, and it's nothing to be ashamed of. | pat+.6 coa+.3
? As long as it takes. Some guys come up in a month, some take four years. | pat+1.0 amb-1.0 cmp+.2
- Plan on two or three years. That's our model. | amb-.8 con-.5 | contend+.2 deep+.2

G Would you be okay spending a full year in the AHL?
R If that's what it takes. I just want a clear path up.
++ That's mature. You'll have a path and a timeline in writing from our development staff. | pat+.5 coa+.5 loy+.3
+ Good. And if you force our hand early, we'll gladly change the plan. | amb+.4 cmp+.4
? A full year minimum, probably more. That's the reality for most picks. | pat+1.0 amb-1.1 con-.3
- You might not have a choice, honestly. | con-.7 loy-.6 amb-.4

G What's the one part of your game you know you need to fix?
R My skating. My first three steps aren't where they need to be.
++ We have one of the best skating coaches in hockey. She's going to love working with you. | coa+.6 amb+.3
+ Honest answer. We'll build your summer around it. | coa+.5 pat+.3
? It's more than three steps, son. It's going to take a lot of hours. | cmp+1.0 coa+.4 con-1.0
- That's the thing that worries our scouts the most, honestly. | con-.9 amb-.4

P Will I have a say in my own development plan?
++ It's your career. We build the plan with you, not for you. | con+.5 loy+.4 coa+.2
+ You'll have input, and you'll know the reasons behind every decision. | coa+.6 pat+.3
? We've done this a hundred times. Trust the process. | coa+1.0 pat+.4 con-1.0 amb-.3
- The development staff decides. That's their job. | con-.8 loy-.5

G Will you commit to our development plan, even when it's frustrating?
R Yes. I know it's not always going to be fun, but I trust you guys.
++ That trust goes both ways. We'll earn it every season. | loy+.6 coa+.4
+ Good. Frustration is part of it. We'll talk you through the hard parts. | coa+.5 pat+.4
? We'll see. A lot of kids say that tonight and forget it by January. | cmp+1.0 coa+.3 loy-.8 con-.4
- You don't really have a choice once you sign. | loy-.8 con-.5 fam-.3

P Do you have a good goalie coach for prospects?
@ pos=G
++ One of the best in the business, and he'll be on the phone with you every week. | coa+.6 loy+.3 | thin+.2
+ A full-time development goalie coach who visits all our goalies during the season. | coa+.5 pat+.3
? Goalies have to figure it out themselves eventually. We'll give you the reps. | con+1.0 cmp+.4 coa-.8
- Our goalie coach mostly works with the NHL guys. | loy-.6 coa-.5 amb-.3

P If I have a big year in junior, will you bring me up sooner?
@ league=CHL
++ Absolutely. Play your way onto our roster and we'll make room. | amb+.6 cmp+.4 | rebuild+.3 thin+.3
+ A big year changes the conversation. We'll be watching every game. | cmp+.4 coa+.3
? A big year in junior doesn't mean a big year here. Plenty of guys learned that the hard way. | pat+1.0 con-1.0 amb-.4
- The CHL rule decides that, not us. You're there until twenty either way. | amb-.7 con-.4 | young+.2

G How do you handle being sent down?
R I'd hate it, but I'd use it. I'd go down and make it impossible to keep me there.
++ That's the attitude that gets guys called back up in a week. | cmp+.6 con+.4
+ Good. Every guy who makes it has a story about getting sent down. | coa+.5 pat+.3
? Hate it quietly. Nobody up top wants to hear complaining. | coa+1.0 pat+.4 con-.8 loy-.3
- You'll probably find out soon enough. | con-.8 loy-.6 amb-.3

P Do your prospects actually get better, or do they stall?
++ Look at our last five first-rounders. Every one of them is in the NHL. | amb+.5 con+.4 coa+.3
+ We've had a few stall, honestly. We changed our staff and our approach because of it. | coa+.5 loy+.4
? Prospects stall when they stop working. That's on them, not us. | cmp+1.0 coa-.6 loy-.6
- It's hit or miss. Every team's record is like that. | con-.6 coa-.5 amb-.4

G Would you be willing to play the wing if we asked?
@ pos=F
R I've always been a center, but I'll play wherever gets me in the lineup.
++ That's the answer of a pro. Playing both makes you twice as hard to send down. | coa+.5 amb+.4 | thin+.2
+ Good. We'll start you at center and see how camp shakes out. | con+.4 loy+.3
? We'll probably move you to the wing full-time. Centers in this league are a different animal. | coa+1.0 pat+.3 con-1.0
- We already have more centers than we need, so you'll be on the wing either way. | con-.7 amb-.5 | deep+.3

## direction
P Are you guys rebuilding or trying to win now?
@ role=rebuild
++ We're building something, and you're one of the pieces we're building around. | amb+.5 loy+.5 | rebuild+.4
+ We're young and getting better every year. You'll grow with this group. | loy+.4 pat+.4
? We're rebuilding, which means losing for a while. Some guys can't handle that. | cmp+1.0 pat+.6 amb-.6 con-.2
- We're rebuilding, but honestly we're still figuring out the plan. | loy-.6 con-.5 coa-.4

P Are you guys trying to win the Cup this year?
@ role=contend
++ Yes, and we want young guys who can help us do it. Come to camp hungry. | cmp+.6 amb+.4 | contend+.3
+ We are, and that means you'll learn from players who've won. That's a gift. | coa+.6 pat+.3
? We're going for it, so there may not be room for a rookie. You'd be learning from the press box. | pat+1.0 amb-1.1 cmp+.2
- Our window is now. We'll probably trade some prospects at the deadline. | loy-.9 fam-.4 con-.3

G How do you feel about joining a team that's rebuilding?
@ role=rebuild
R Honestly, I like it. It means a chance to play.
++ Exactly. We'll give young players real roles, and you could be one of the first. | amb+.6 con+.3 | rebuild+.4
+ It'll be tough at times, but the guys who stick through it get to win later. | loy+.5 pat+.4
? Chance to play, sure. But losing every night is hard on young guys. Are you sure? | cmp+1.0 pat+.5 con-.6 amb-.3
- Don't get too excited. We'll bring in veterans to help shelter you. | amb-.8 con-.5 | thin-.2

G Would you be okay waiting your turn on a contender?
@ role=contend
R I'd rather earn it than wait for it, but I get it. You guys are good.
++ Earn it, then. We've had young guys push their way into our lineup before. | cmp+.6 amb+.4
+ The wait won't be long if you work. Our veterans will make you better. | coa+.5 pat+.4 loy+.2
? Waiting is the job here. Our room is full of guys who've won. | pat+1.1 coa+.3 amb-1.1
- There's really no spot for a while. That's the honest truth. | amb-.9 con-.5 | deep+.3

P What's the plan for this team in three years?
++ Contending, with you in the middle of it. That's why you're here. | amb+.5 loy+.5 con+.3
+ Better than today, built around the young core we're adding right now. | loy+.4 pat+.4
? Hard to say. This league changes fast, and so do rosters. | pat+.7 cmp+.3 loy-1.0 con-.4
- We're focused on this year. Three years from now is a long way off. | loy-.7 amb-.4 | contend+.2

P Why did you pick me over the other guys on the board?
++ Because we think you'll be the best player in this class when it's all said and done. | con+.7 amb+.3 | top+.3
+ Your compete level. Every scout we have came back talking about it. | cmp+.5 coa+.3
? Honestly, he went one pick before us. You were next on our list. | cmp+1.0 con-1.0 loy-.4
- You were the best player left. Simple as that. | con-.6 loy-.6 | late+.2

G What do you know about our team?
R I know you've got a great young core and fans who care a lot.
++ Then you know you're going to love it here. This city is going to love you back. | loy+.5 fam+.5
+ You did your homework. That tells me a lot about you. | coa+.4 con+.3
? The fans care a lot, which means they'll let you hear it when you struggle. | cmp+1.0 con+.3 fam-.6 pat-.2
- Our fans are tough on young players. Don't read the comments. | con-.7 fam-.5 loy-.3

P Will you trade me if a better deal comes along?
++ You're a big part of our plans. We didn't draft you to trade you. | loy+.7 fam+.4
+ Nobody's untouchable in this league, but you're about as close as a prospect gets. | con+.4 loy+.3
? Everyone has a price. Play well and you'll make that price very high. | cmp+1.0 con+.3 loy-1.0 fam-.4
- Prospects get moved all the time. That's just the business. | loy-.9 fam-.5 | contend+.2

G Is winning or playing time more important to you right now?
R Winning. But I want to be part of the reason we win.
++ That's a franchise answer. You'll be part of why we win, soon. | cmp+.6 amb+.4 loy+.2
+ Good. Earn the trust and the minutes come with it. | coa+.5 pat+.3
? Then get used to the press box for a bit. Our lineup wins games. | pat+1.0 amb-1.1 | contend+.3
- Most rookies don't play a role in winning. Don't put that on yourself. | con-.8 amb-.5

P Who's going to be my coach?
++ A coach who loves young players. He played a nineteen-year-old on his top line last year. | amb+.6 coa+.3 | rebuild+.2
+ A teacher. He's demanding, but every young guy who's played for him got better. | coa+.6 pat+.3
? He's old school. Some kids love it, some don't make it through November. | cmp+1.1 coa+.3 con-.5 fam-.4
- We're actually making a coaching change, so I can't tell you yet. | loy-.6 con-.4 pat-.3

G If you were our GM, what would you change about this team?
R I'd add more speed. The game's getting faster every year.
++ Great answer. You just described yourself, and that's why we drafted you. | con+.6 amb+.4
+ We agree. That's exactly where the league is going. | coa+.4 loy+.3
? Funny. Most guys tell me they'd draft themselves earlier. | con+1.1 cmp+.6 coa-.6 fam-.4
- Leave the GM job to me, son. You focus on your game. | con-.9 loy-.5

## depth
P How many guys are ahead of me at my position?
++ Fewer than you'd think. We need help at your position badly. | amb+.6 cmp+.3 | thin+.5
+ A couple. We'll be honest with you about where you stand after camp. | coa+.5 loy+.3
? A few, and they're good. You'll have to be better than them, period. | cmp+1.1 con+.3 pat-.3 amb-.4
- Quite a few. Realistically, you're behind four or five guys. | amb-.8 con-.6 | deep+.4

P Is there a spot on defense for a guy like me?
@ pos=D
++ Our left side is wide open. If you can move the puck, you can play. | amb+.6 con+.4 | thin+.5
+ We're always looking for puck-moving D. Come to camp and show us. | cmp+.4 coa+.3
? Defensemen take longer. Plenty of D-men don't stick until twenty-three. | pat+1.1 amb-1.0 con-.3
- Our blue line is set for the next few years. | amb-.9 con-.4 | deep+.4 contend+.2

G Would you be comfortable playing on your off side?
@ pos=D
R I've done it before. I'm more comfortable on my strong side, but I can do it.
++ That's a big advantage for a young D-man. It'll get you into the lineup faster. | amb+.5 coa+.4 | thin+.2
+ Good. We'll get you reps on both sides at camp. | coa+.5 pat+.3
? You'd probably play there full-time with us. Get comfortable with it. | coa+1.0 cmp+.4 con-.8
- That's going to be a problem with the guys we already have. | con-.7 amb-.5 | deep+.3

G How would you feel about being a backup goalie at first?
@ pos=G
R I'd learn a lot. But I want to be a starter one day.
++ You will be. The backup role is a step on the path, not the destination. | amb+.5 loy+.4
+ Every great goalie spent time as a backup. Use it. | pat+.6 coa+.4
? Some goalies never get out of the backup role. You'll have to steal the job. | cmp+1.1 con+.2 pat-.3 loy-.4
- You'd probably be third string in the AHL to start. | amb-.9 con-.6 | deep+.4

P Is your team deep at my position, or is there room?
++ There's room. We didn't draft you to sit behind a crowd. | amb+.6 con+.3 | thin+.4
+ We're decent there, but nobody's locked in. Good players find a way. | cmp+.5 coa+.3
? We're deep. Competition makes everyone better, or it exposes them. | cmp+1.1 con+.4 pat-.3 amb-.5
- We're stacked there. Honestly, you might be trade bait down the road. | loy-.9 amb-.5 | deep+.3

P Can I play center, or am I going to the wing?
@ pos=F
++ Center. That's where we see your vision helping us most. | con+.5 amb+.4 | thin+.3
+ Both, probably. Versatility gets you to the NHL faster. | coa+.5 pat+.3
? Wing. Centers have to be ready for faceoffs and defensive zone starts on day one. | coa+1.0 con-1.0 cmp+.2
- We don't really see you at center at our level. | con-.8 amb-.5 | deep+.3

G Where do you think you fit in our lineup right now?
R Honestly? Third line, with a chance to move up.
++ That's a fair read. And moving up happens fast when you're good. | con+.5 amb+.4 | thin+.3
+ That's realistic. I respect that. We'll see how camp changes it. | coa+.5 pat+.3
? Third line in this league is a role, not a stepping stone. Can you kill penalties? | cmp+1.0 coa+.4 con-.7 amb-.3
- We see you starting in the minors, to be honest. | amb-.8 con-.6 | deep+.3 contend+.2

P Is anyone at my position close to getting traded?
++ I won't say names, but you could see a spot open up before camp. | amb+.6 cmp+.3 | thin+.2
+ Rosters always change. Stay ready. | coa+.4 pat+.3
? Maybe. Or maybe we trade you. That's hockey. | cmp+.9 con+.2 loy-1.0 fam-.5
- I can't talk about that, and you shouldn't be thinking about it. | con-.6 loy-.5 amb-.3

G What position did you play growing up?
R Defense until I was fourteen. Then my coach moved me up front.
++ That's why you read the game so well. It's going to help you here. | con+.5 coa+.3
+ That background helps you play both ways. Coaches love that. | coa+.5 loy+.3
? We might move you back to D someday. Would you be open to it? | coa+.9 cmp+.4 con-.7 amb-.4
- Interesting. That explains some of the defensive habits our scouts didn't like. | con-.8 coa+.1

P Would you ever move me to defense?
@ pos=F
++ No. We drafted a forward and that's where you'll play. | con+.5 loy+.3
+ We'd only talk about it if you wanted to. It'd be your call. | con+.4 coa+.4
? If it gets you in the lineup faster, we might ask. Big forwards make good D. | coa+1.0 amb+.4 con-.8
- We haven't ruled anything out. Our forward group is crowded. | con-.7 loy-.4 | deep+.4

## family
P Can my family come to development camp?
++ Of course. Your family is part of this now. We'll have tickets and a hotel for them. | fam+.8 loy+.4
+ Absolutely. We do a family day at the end of camp. | fam+.6 coa+.2
? They can come, but camp is work. You'll see them at night, maybe. | cmp+.9 coa+.3 fam-1.0
- We prefer players come alone. It's easier to focus. | fam-1.0 loy-.4

G Who's the biggest influence in your hockey life?
R My dad. He built a rink in our backyard every winter.
++ That's a great story. Tell him he's welcome in our building anytime. | fam+.8 loy+.3
+ Backyard rinks build players. We see it in how you handle the puck. | fam+.4 con+.3
? Good. Now you'll have pro coaches. Sometimes that's a tough handoff for dads. | coa+1.0 cmp+.3 fam-.9
- We'll make sure your dad knows the coaching staff makes the decisions now. | fam-1.0 con-.4

P How far is your city from my hometown?
++ Close enough for your family to come to games. We'll help with that. | fam+.8 loy+.3
+ A short flight. A lot of our guys' families visit all the time. | fam+.6 coa+.2
? Far. Moving away from home is part of growing up in this game. | cmp+.9 con+.3 fam-1.0 pat-.2
- Pretty far, honestly. You'll have to get used to that. | fam-.9 loy-.3

G Have you ever lived away from home before?
R I billeted for two years in junior. I'm used to it.
++ That's huge. You'll handle the move to pro hockey better than most. | con+.5 fam+.3 coa+.2
+ Good. We'll set you up with a veteran family in town anyway. | fam+.6 loy+.3
? Living with a billet family isn't the same as being on your own in a pro city. | cmp+.9 coa+.4 con-.8
- We'll see how that goes. Some guys struggle in their first pro year. | con-.7 fam-.5

P Do you help young players find somewhere to live?
++ Yes. We have a player services staff, and we'll put you with a veteran's family if you want. | fam+.7 loy+.4
+ We do. Housing, car, a bank account, all of it. | fam+.4 coa+.4
? We help, but part of turning pro is figuring things out for yourself. | con+.9 cmp+.4 fam-.9
- Your agent usually handles all that. | fam-.8 loy-.5

G What does your family think about you turning pro?
R My mom wants me to finish school first. My dad wants me in the NHL yesterday.
++ We'll talk to both of them. A good plan should make your whole family comfortable. | fam+.8 col+.3 loy+.3
+ That's a common debate. There's no wrong answer, and we'll respect it. | fam+.5 pat+.4
? At some point it's your decision, not theirs. | con+1.0 amb+.4 fam-1.0
- We'd like your dad's answer, to be honest. | col-.7 fam-.5 | ncaa-.3

P Is your city a good place for a young player to live?
++ It's a hockey city through and through. You'll be treated like family. | fam+.6 loy+.5
+ Great city, good restaurants, and the guys on the team all live close together. | fam+.4 coa+.2
? It's a fishbowl. Everyone knows who you are, good night or bad. | con+.8 cmp+.4 fam-.8 pat-.2
- It's fine. You'll mostly be at the rink anyway. | fam-.7 loy-.4

G Who's here with you tonight?
R My parents, my grandma and my little brother. He's already wearing your hat.
++ Go get them. We want a picture with the whole family on stage. | fam+.9 loy+.4
+ That's great. We'll make sure they get a tour of our building this fall. | fam+.6 loy+.2
? Enjoy tonight. Tomorrow it's all business. | cmp+1.0 coa+.3 fam-.8
- Let's keep this quick. We've got another pick to prepare for. | fam-.9 loy-.5 con-.3

P Can I take time off if something happens back home?
++ Family comes first. Always. That's not negotiable in our organization. | fam+.9 loy+.5
+ Of course. We've done it for plenty of players. Just talk to us. | fam+.6 coa+.3
? We'll handle that if it comes up. Pros learn to compartmentalize. | cmp+.9 con+.3 fam-1.0
- Your schedule is your job now. We'd have to talk about it at the time. | fam-1.0 loy-.4

G Do you think you can handle being far from home?
@ league=EURO
R It'll be hard. But I've wanted to play in North America since I was a kid.
++ We'll make it as easy as we can, and we've got guys from your country in our room. | fam+.6 loy+.4 | euro+.3
+ That dream will carry you through the tough nights. We'll help with the rest. | fam+.4 coa+.4
? The first year away breaks a lot of European kids. You need to be sure. | cmp+1.0 con+.3 fam-.9 pat-.2
- We don't do much special for European players. You'll adjust. | fam-.9 loy-.5 | euro-.2

## idols
P Who do you see me playing like?
++ A smaller version of a guy who just won the Hart. That's how our scouts describe you. | con+.6 amb+.4 | top+.3
+ A two-way player who coaches trust in every situation. | coa+.5 cmp+.3
? Like yourself. We don't do comparisons. You'll have to write your own story. | con+1.1 cmp+.6 amb-.6 coa-.5
- A dependable depth player. That's a compliment in this league. | amb-.8 con-.6 | late+.3

G Who was your favorite player growing up?
R Patrice Bergeron. I used to watch every faceoff he took.
++ Then you know what a two-way center looks like. We see that in you. | con+.5 coa+.4
+ Great player to model yourself after. We'd love to see that attention to detail. | coa+.6 pat+.3
? Lots of kids love Bergeron. Very few play like him. Show us you're one. | cmp+1.0 con-.8 coa+.2
- That's a high bar. Let's just focus on getting you to the NHL. | con-.7 amb-.5

G Which player in the league do you model your game after?
R Cale Makar. The way he skates the puck out of trouble.
++ That's the kind of puck-moving we drafted you for. Don't lose that. | con+.6 amb+.4
+ Good model. We'll work on the defensive side so the offense can shine. | coa+.6 pat+.3
? Everyone wants to be Makar. Most guys need to learn to defend first. | cmp+1.0 coa+.4 con-.9
- Let's be realistic. Nobody's Makar. | con-.9 amb-.6

P Do you like an up-tempo style or a structured system?
++ Up-tempo. We want young legs pushing the pace, and that's you. | amb+.5 con+.4 | rebuild+.2
+ Structured, but with freedom inside it. You'll learn it fast. | coa+.6 pat+.3
? Structured. If you can't play without the puck, you won't play. | coa+1.0 cmp+.4 con-.9 amb-.2
- Our system is our system. Players adapt or they don't play. | con-.8 coa-.2 loy-.4

G Do you see yourself as a scorer or a playmaker?
@ pos=F
R A playmaker. I'd rather make the pass than take the shot.
++ Our wingers are going to love you. We've needed a passer for years. | con+.5 amb+.4 | thin+.3
+ That vision is why we drafted you. We'll help you add a shot. | coa+.6 con+.2
? In this league, you shoot or you get scouted out of the play. You'll need to change that. | coa+.9 cmp+.4 con-.9
- Playmakers who don't shoot don't last long. | con-.9 amb-.4

P Is it okay if I play a physical game?
++ We love it. Every team needs a guy the other side hates playing against. | con+.5 cmp+.4 | thin+.2
+ Physical with discipline. Hit hard, stay out of the box. | coa+.6 cmp+.2
? Pick your spots. Some young guys run around and get exposed. | coa+.9 pat+.4 con-.8 cmp-.2
- We'd rather you stay out of the box. Penalties kill us. | con-.7 cmp-.5

G What kind of goalie are you: blocker or reactive?
@ pos=G
R Reactive. I trust my reads more than my size.
++ That's how the modern game is played. We love that about you. | con+.6 amb+.3
+ Good. Our goalie coach will help you add some structure to it. | coa+.6 pat+.3
? Reactive goalies get beaten on rebounds at this level. You'll need to adjust. | coa+1.0 cmp+.4 con-.9
- Our goalie coach is going to rebuild your game from scratch. | con-1.0 coa+.1

P Did you watch me play in person?
++ Twelve times. I was in the building for your hat trick in the playoffs. | con+.6 loy+.5
+ A few times, and our scouts saw you more than anyone in this class. | con+.4 coa+.3
? Once. You didn't play well that night, but we liked how you responded. | cmp+1.0 coa+.4 con-.8
- Mostly video, honestly. Our scouts handled you. | loy-.8 con-.4

G Who's the toughest player you've ever played against?
R A defenseman in our league who went first overall last year. He never gave me an inch.
++ And you still had points against him. That tells us everything. | con+.6 cmp+.4
+ Playing against guys like him every night is what gets you ready. | cmp+.5 coa+.3
? He's in the NHL now. You're not yet. Remember that. | cmp+1.0 amb+.3 con-.8 loy-.3
- We saw those games. He won most of those battles. | con-1.0 cmp+.1

P What did you guys like most about my game?
++ Your hockey sense. You see plays nobody else in this class sees. | con+.7 amb+.3
+ Your compete and your habits away from the puck. Coaches trust that. | coa+.5 cmp+.4
? Honestly? Your upside. You're raw, but the ceiling is high. | pat+1.0 coa+.5 con-.8 amb-.5
- Your size, mostly. The rest still needs a lot of work. | con-.9 amb-.4

## work
G What does your summer training look like?
R Six days a week. Gym in the morning, ice in the afternoon.
++ That's a pro schedule already. Our strength staff will love working with you. | cmp+.5 coa+.4 con+.3
+ Good. We'll send you a program so you're building the right things. | coa+.6 pat+.2
? Six days isn't the number we care about. What you do in those days is. | cmp+1.0 coa+.3 con-.8
- We'll need to change most of that. Our program is different. | con-.8 coa-.2 loy-.3

G How do you handle a bad game?
R I watch the video that night and figure out what went wrong.
++ That's exactly what we want. Our video coaches will be in your phone every week. | coa+.6 cmp+.3
+ Good habit. Just don't let one game turn into three. | coa+.4 pat+.4
? Watching it that night? Some nights you're better off sleeping. Can you let go? | pat+1.1 con+.4 cmp-.7 coa-.4
- Bad games happen. We'll tell you what went wrong. | con-.6 coa-.3 loy-.3

P What do your prospects work on in the summer?
++ Whatever makes them NHL players fastest. We build a custom plan for every guy. | amb+.5 coa+.4
+ Strength, skating and a skills block with our development coaches. | coa+.5 pat+.3
? Whatever they want, honestly. The best ones find a way. | con+.9 cmp+.4 coa-.8 loy-.3
- We send everyone the same program. | coa-.6 loy-.5 con-.3

G Are you willing to put on weight this summer?
R If you think I need it, I'll do it. I know I'm on the light side.
++ A few pounds of muscle and you'll be a different player. Our nutrition staff will take care of you. | coa+.6 amb+.3
+ We'll do it the smart way. We don't want you to lose your speed. | coa+.5 con+.3
? You do need it. Light guys get pushed around at this level, and it shows quick. | cmp+1.0 coa+.3 con-.9
- If you don't, you'll have a hard time at camp. | con-.8 fam-.2

G What would your junior coach say about your work ethic?
@ league=CHL
R First guy on the ice, last guy off. He'd say that.
++ He did say that. We called him. That's a big reason you're here tonight. | con+.6 loy+.4
+ That's what we heard. Keep it up at our camp and the vets will notice. | coa+.5 cmp+.3
? He also said you take some shifts off when you're tired. True? | cmp+1.0 coa+.4 con-.9 loy-.3
- Coaches always say that about their draft picks. | con-.7 loy-.5

P How hard is your development camp?
++ Hard, and the guys who shine there jump the line. It's your first chance to impress. | cmp+.6 amb+.4
+ Tough but fair. Lots of teaching and lots of skating. | coa+.5 pat+.3
? Hard enough that some guys go home early. Come in shape or don't come. | cmp+1.1 con+.3 fam-.4 coa-.3
- It's mostly testing and meetings. You'll survive it. | cmp-.6 amb-.4

G If we asked you to work on your defensive game, how would you react?
R I'd do it. I know it's the thing keeping me out of the NHL.
++ That's the most mature thing a draft pick has said to me tonight. | coa+.6 con+.3 loy+.2
+ Good. Our coaches will make it the priority, and it'll pay off fast. | coa+.5 amb+.3
? It's the thing keeping you out of our lineup, for sure. Big gap to close. | cmp+.9 pat+.4 con-.9
- We'll see. Every forward says that and then cheats for offense. | con-.8 loy-.5

P How many skills coaches do you have?
++ Three full-time, plus a skating coach. You'll be spoiled. | coa+.6 amb+.3
+ Two, and they work with prospects all year long. | coa+.5 pat+.2
? Enough. The best skills coach is the hours you put in on your own. | cmp+1.0 con+.4 coa-.7
- One, and he's mostly with the NHL guys. | coa-.7 loy-.4 amb-.3

G Are you a rink rat?
R I'd sleep there if they let me.
++ That's what our scouts said. You're going to fit right in. | cmp+.5 loy+.4 con+.3
+ Good. Just don't burn yourself out. Recovery matters too. | coa+.5 pat+.4
? Rink rats work hard. Pros work smart. Learn the difference. | coa+.9 pat+.4 con-.8 cmp-.2
- We'll need to manage that. Young guys overtrain all the time. | con-.6 cmp-.5

G What's your recovery routine like?
R Honestly, I haven't thought about it much.
++ That's fine. That's our job. You'll learn more about recovery in a week with us than in five years. | coa+.6 loy+.3
+ You'll learn it at camp. It's the difference between a good season and a great one. | coa+.5 pat+.3
? You'd better start. That's how young guys end up hurt in their first pro season. | cmp+.9 coa+.4 con-.9
- That worries me a little, to be honest. | con-.8 loy-.3

P What separates the guys who make it from the ones who don't?
++ Guys like you who show up every day. That's why we took you. | con+.5 loy+.4 cmp+.3
+ Habits. Sleep, food, video, practice. It sounds boring, but it's everything. | coa+.6 pat+.3
? Talent gets you drafted. Work keeps you here. A lot of first-rounders found that out. | cmp+1.3 con-.8 coa+.3
- Most of it is luck, honestly. Right place, right time. | coa-.6 con-.4 cmp-.4

## leadership
G Do you see yourself as a leader?
R I lead by example. I'm not a big talker, but I work.
++ That's the best kind of leader. Our captain is exactly the same. | con+.5 loy+.4
+ Good. Leadership grows as you get older. You'll find your voice. | pat+.5 coa+.3
? Leading by example is great, but at some point you'll have to talk. Can you? | cmp+1.2 con-.9 coa+.4
- Leadership is for veterans. You focus on your game. | con-.7 loy-.4

G You wore the C in junior. What did that teach you?
@ league=CHL
R That the hardest part is the bad nights, when you have to stand up and say something.
++ That's a captain's answer. Our room will respect you from day one. | con+.6 loy+.4
+ That's real experience. It'll help you in a pro room faster than you think. | coa+.4 con+.3
? In a pro room you'll be the youngest guy again. Can you handle not being the guy? | pat+.9 coa+.4 con-.9 amb-.2
- None of that matters in our room. You start at the bottom. | con-.9 loy-.4

P Will the veterans help me, or do they freeze rookies out?
++ Our veterans are great with kids. Two of them asked about you this morning. | loy+.6 fam+.3 con+.3
+ They'll push you, but they'll help you. That's the culture we've built. | coa+.5 cmp+.3
? Some of them will, some won't. They're competing for jobs too. | cmp+1.0 con+.4 loy-.6 fam-.4
- That's up to you. Earn their respect and they'll treat you right. | loy-.6 fam-.4 con-.3

G How would your teammates describe you?
R Loyal. I'd go to war for the guys in my room.
++ That's exactly why we wanted you in our locker room. | loy+.7 con+.3
+ That's a great trait in a young player. It'll serve you well. | loy+.5 coa+.3
? Good. Now you'll be going to war against guys you grew up idolizing. Ready? | cmp+1.0 con+.3 loy-.3 fam-.4
- Teammates always say nice things. We'll see how you are in a pro room. | loy-.8 con-.5

G What would you do if a veteran took a run at you in camp?
R Answer it. Respectfully, but I'd answer it.
++ That's the right answer. Nobody respects a guy who backs down. | con+.6 cmp+.4
+ Smart. Stand up for yourself without starting a war. | coa+.5 cmp+.2
? You'd better be ready for what comes after you answer it. | cmp+1.0 con+.4 coa-.5 fam-.3
- You'd be better off keeping your head down. | con-.8 cmp-.5

P Is there a leadership group I can learn from?
++ One of the best in the league. Our captain will text you before you leave this building. | loy+.6 coa+.4
+ Yes. We pair every rookie with a veteran mentor. | coa+.5 fam+.3
? They're busy winning games. You'll learn by watching. | pat+1.2 coa+.4 loy-.9 fam-.4
- We're actually short on leaders right now. You'd be on your own a bit. | loy-.7 con-.3 fam-.3

G Can you be a leader at eighteen?
@ age=young
R I think so. Age doesn't matter if you're doing things the right way.
++ We agree. We've seen it in how you carry yourself. | con+.6 loy+.3
+ That's the right mindset. Lead with your work first. | coa+.5 pat+.3
? Age matters in a pro room. You'll need to read it carefully. | coa+.9 pat+.4 con-.9
- At eighteen you need to listen, not lead. | con-.9 loy-.3

G How do you treat the trainers and the equipment staff?
R Like family. My dad always said that's how you know who a guy really is.
++ That's why our scouts kept talking about you. Character matters here. | loy+.6 fam+.4
+ Good. Those people will look after you more than anyone. | loy+.5 coa+.3
? Good answer. We'll ask them in November whether it's true. | cmp+.9 coa+.3 con-.7 loy-.2
- Everyone says that tonight. | loy-.8 con-.4

## pressure
P How much media attention would I get?
++ Some, and we'll help you handle it. Our PR staff trains every rookie. | coa+.5 con+.3 fam+.2
+ It's a hockey market, so a fair amount. You'll get used to it fast. | con+.4 cmp+.3
? A lot, and they'll be brutal on bad nights. Thick skin required. | con+1.0 cmp+.4 fam-.7 pat-.2
- Too much, honestly. It's crushed a few young players here. | con-.9 fam-.5

G How do you handle pressure?
R I love it. The bigger the game, the better I play.
++ We've seen it. Your playoff numbers are a big reason we took you. | con+.6 cmp+.4
+ Good. Big games are what this organization is all about. | cmp+.5 loy+.3 | contend+.2
? Everybody loves pressure until their first slump in a hockey market. | pat+.9 coa+.3 con-.9
- We'll see. The pressure here is different from anything you've felt. | con-.8 fam-.3

G Going this high comes with expectations. Can you handle that?
@ age=young
R I've had expectations on me since I was twelve. I'm used to it.
++ It shows. You've handled everything thrown at you so far. | con+.6 amb+.3 | top+.4
+ Good. We'll take some of that weight off you. Just play. | fam+.4 coa+.4
? These expectations are bigger. A whole city just started counting on you. | cmp+1.0 con+.2 fam-.6 pat-.3
- A lot of guys picked this high flamed out. Don't be one of them. | con-.9 fam-.3

P Do fans turn on young players when they struggle?
++ Not ours. They're patient with kids who work hard, and you work hard. | fam+.5 loy+.4 con+.3
+ Every fan base gets frustrated, but they love players who care. | loy+.4 coa+.3
? Sometimes. You'll hear it. The good ones use it as fuel. | cmp+1.0 con+.4 fam-.6
- Yes. Don't read social media. Ever. | con-.8 fam-.5

G What would you do if you went pointless in your first ten games?
R Keep shooting. Keep working. It'll turn.
++ That's the attitude. Slumps end for players who keep doing the right things. | con+.5 cmp+.4
+ Good. We'll be there to help you look at the details. | coa+.6 loy+.3
? Ten games pointless and you'd probably be in the AHL. That's the reality. | cmp+.9 pat+.4 con-.9 amb-.3
- I'd be worried, honestly. | con-.9 loy-.4

P Is there pressure to make the team right away?
++ No pressure from us. We know you'll get there, and we're patient. | pat+.5 fam+.4 loy+.3
+ Only the pressure you put on yourself. We'll be realistic with you. | coa+.5 pat+.3
? There's always pressure on a high pick. Don't pretend there isn't. | cmp+1.0 con+.4 fam-.5 pat-.4
- Our fans expect it, honestly. They want results. | con-.8 fam-.6 | top+.2

G How do you deal with criticism?
R I take it. Coaches criticize the guys they care about.
++ Exactly right. You're going to get coached hard because we believe in you. | coa+.6 loy+.4
+ Good. Our coaches are direct, but they're fair. | coa+.5 pat+.3
? Some of the criticism will be public. Ready for that? | cmp+.9 con+.4 fam-.6 coa-.2
- You'll get plenty of it here. | con-.8 loy-.4

P Will the media compare me to the guys picked ahead of me?
++ Let them. In five years, they'll be comparing those guys to you. | con+.7 cmp+.4
+ They will for a while. We don't care about that, and you shouldn't either. | coa+.5 pat+.3
? Every day. You're going to be measured against them your whole career. | cmp+1.1 con+.3 fam-.5 pat-.4
- Probably. And early on, it might not look great. | con-.9 | late+.2

G Have you ever been booed?
R In every road rink in the league. I kind of like it.
++ That's a great sign. Guys who like being booed tend to love playoff hockey. | con+.6 cmp+.4
+ Good. You'll hear it plenty in this league. | cmp+.5 coa+.2
? Wait until it's your own fans. That's a different feeling. | cmp+.9 pat+.3 con-.7 fam-.4
- Being booed in junior is a lot different from what you'll hear here. | con-.8 fam-.3

## europe
P Can I stay in Europe another year before coming over?
@ league=EURO
++ Absolutely. Playing against men in your league is great development. We'll watch closely. | pat+.6 fam+.5 | euro+.4
+ We'd like you here soon, but another year at home is fine if it's the right step. | fam+.4 coa+.3
? We want you in North America now. The small rink takes adjusting, and the sooner the better. | amb+1.1 cmp+.3 fam-.8 pat-.4
- If you stay, someone else might take your spot in our plans. | fam-.8 loy-.6 | euro-.2

G Are you ready to play on a smaller rink?
@ league=EURO
R I think so. I've played some international games on NHL ice.
++ It suited you. Our scouts saw you at the World Juniors and you looked comfortable. | con+.6 amb+.3
+ It takes a few months. We'll give you time to adjust. | pat+.5 coa+.4
? Some European players never adjust. You'll need to be quicker with decisions. | cmp+1.0 coa+.4 con-.9
- We're worried about that, honestly. | con-.9 amb-.4

P Will you help me learn English and settle in?
@ league=EURO
++ Yes. A tutor, a host family and two teammates who speak your language. | fam+.7 loy+.4 | euro+.3
+ We have a player services team that handles everything for European players. | fam+.5 coa+.3
? Most guys pick it up fast. The locker room is the best teacher. | con+.8 cmp+.4 fam-.8
- Your agent usually takes care of that. | fam-.8 loy-.5

G Would you consider playing in the AHL instead of back home?
@ league=EURO
R Maybe. I've heard the AHL is a hard league. I want to be close to the NHL.
++ It is, and it's the fastest path to our lineup. We'd love to have you there. | amb+.6 cmp+.3 | thin+.2
+ We'll decide together. Both paths can work for you. | fam+.4 coa+.4
? The AHL is long bus rides and a lot of hockey. It's not for everybody. | cmp+1.0 con+.3 fam-.7 pat-.2
- You'd probably be a depth player there at first. | amb-.8 con-.5

P Do you have other players from my country on the team?
@ league=EURO
++ Three of them, and they've already asked when you're coming. | fam+.7 loy+.4 | euro+.3
+ One in the NHL and one in the AHL. You won't be alone. | fam+.5 coa+.2
? Not right now. You'd be the first in a while. Some guys like that. | con+.9 cmp+.4 fam-.8
- No. You'll have to adapt on your own. | fam-.9 loy-.4

G What does your club back home want you to do?
@ league=EURO
R They want me to stay. They've offered me a bigger role and a new contract.
++ We'll work with them. A good relationship with your club helps everyone. | fam+.5 loy+.5 pat+.3
+ That's a compliment to you. Let's weigh it together. | pat+.4 coa+.4
? Your club wants what's good for your club. We want what's good for your career. | amb+1.0 con+.3 loy-.8 fam-.3
- If you re-sign there, we may lose interest. | loy-.9 fam-.5

P Will I lose my rights if I stay in Europe too long?
@ league=EURO
++ We hold your rights for years. Take the time you need, and we'll be in touch every month. | pat+.6 loy+.4 fam+.3
+ You've got a few years. We'll make a plan before that becomes an issue. | coa+.5 pat+.3
? Eventually, yes. Don't make us wait until the last minute. | cmp+.9 amb+.4 loy-.7 fam-.4
- If you're not here in two years, honestly, we'll move on. | loy-.9 fam-.4 pat-.3

G Why do you want to play in the NHL?
@ league=EURO
R Because it's the best league in the world. I want to know how good I really am.
++ That's what we want to hear. You're going to find out you're very good. | con+.6 cmp+.4
+ Good reason. Come over when you're ready and we'll show you. | pat+.4 fam+.3
? You'll find out fast. Some guys don't like the answer. | cmp+1.0 con+.3 fam-.5 pat-.3
- Plenty of guys say that, then go home after a year. | con-.8 loy-.4 fam-.3

G Are you comfortable with the North American schedule?
@ league=EURO
R Eighty-two games is a lot. But I've been training for it.
++ It shows. Your conditioning numbers were the best of the Europeans we tested. | con+.6 coa+.3
+ It takes a season to get used to. We'll manage your workload. | coa+.5 pat+.4
? A lot of European rookies hit a wall in January. You'll need to push through. | cmp+1.0 coa+.3 con-.8
- That worries us a bit, honestly. | con-.8 amb-.4

## contract
P When would you want to sign my entry-level deal?
++ This summer, if you're ready. We'd love to get it done before camp. | amb+.6 con+.4 | older+.3
+ When it makes sense for your development. We'll talk with your agent soon. | coa+.4 pat+.4
? When you show us you're ready. The contract is the easy part. | cmp+1.0 con-.8 amb-.4
- There's no rush. We hold your rights for a while. | amb-.8 loy-.5

G Has your agent talked to you about an entry-level deal?
R A little. He says the money is pretty standard, so it's more about timing.
++ He's right. The timing is now, if you want it. | amb+.6 con+.3 | older+.3
+ Exactly. We'll work out the right moment together. | coa+.4 pat+.4
? Timing is everything. Sign too early and you burn a year of your deal. | pat+.9 coa+.4 amb-.9
- We'll talk to your agent when we're ready. | loy-.7 con-.4

P Would signing early burn a year of my contract?
++ Not if you play under ten games. The slide rule protects you, and we'll explain it all. | coa+.5 pat+.4 con+.2
+ It might, but we'd only do it if you're ready to play here. | amb+.4 coa+.4
? Probably. That's the price of being in a hurry. | pat+.9 cmp+.3 amb-.9
- That's your agent's job to figure out. | loy-.7 coa-.4

G Do you want to sign tonight, or take the summer?
R I want to sign. I don't want there to be any question I'm all in.
++ Then let's make it happen. We'll have papers ready before you leave. | amb+.6 loy+.5 | older+.3
+ We love that. Let's do it the right way, with your agent and your family. | fam+.4 coa+.4
? Tonight's emotional. Sleep on it. We want a commitment you mean. | pat+1.0 coa+.3 amb-.8 con-.3
- We're not ready to offer anything tonight. | amb-.9 loy-.6

P Are the bonuses in my deal going to be fair?
@ age=older
++ Absolutely. We use the max bonuses for guys we believe in. | con+.5 amb+.4 | top+.4
+ We'll be fair. Your agent will see the full structure this week. | coa+.4 loy+.3
? Bonuses are earned. Hit the numbers and you get paid. | cmp+1.1 con+.3 loy-.5
- Bonuses depend on where you were picked. Yours will be modest. | con-.8 loy-.4 | late+.3

G What matters more to you: signing now or staying where you are?
R Signing. I want to be a pro.
++ Then let's make you a pro. We'll get your agent on the phone tomorrow. | amb+.6 con+.4 | older+.3
+ Good. We'll make sure it's the right step at the right time. | coa+.5 pat+.3
? Being a pro means sometimes you sign and still go back. Are you okay with that? | pat+1.2 coa+.4 amb-1.0
- Let's not rush. You're not ready yet in our eyes. | amb-.9 con-.6

P Can I sign and still go back to junior if needed?
@ league=CHL
++ Yes. You'd sign, come to camp and we'd decide together. Junior is a safety net, not a step back. | pat+.5 coa+.4 fam+.3
+ That's how it works for most guys your age. Totally normal. | coa+.5 pat+.3
? You can, but most guys who sign and go back lose a year on their deal. | pat+1.0 amb-.8 cmp+.4 con-.5
- We'd only sign you if you're making the team. | amb-.7 pat-.4 | young+.2

G Would you sign a two-way deal to start?
@ age=older
R Sure. I know that's how it works for most guys.
++ It's just paperwork. If you play well, it won't matter where you start. | con+.4 amb+.4 coa+.2
+ Right. It protects both of us while you develop. | coa+.5 pat+.3
? It means you'll probably start in the minors. Be ready for that. | pat+1.2 cmp+.5 amb-1.0
- That's all we're going to offer. | amb-.8 loy-.5 con-.3

P What happens to my rights if I go to college?
@ league=NCAA,NCAA_BOUND
++ We keep them while you're in school, and we'll be at your games. No pressure, no deadlines. | col+.8 pat+.4 fam+.3
+ We hold them for four years. That gives you plenty of room. | col+.5 coa+.3
? We hold them, but if you stay all four years, you could walk as a free agent. Think about that. | amb+.8 col-1.0 loy-.4
- If you stay too long, we'll probably trade your rights. | col-.9 loy-.6 fam-.3

G Is there any reason you wouldn't sign with us?
R Only if it meant giving up on finishing school. That matters to my family.
@ league=NCAA,NCAA_BOUND
++ We'd never make you choose. Finish school, and the contract will be waiting. | col+.9 fam+.6 loy+.3
+ We understand. We'll find a plan that works for your family. | fam+.6 col+.4
? We hear you, but every year in school is a year you're not with us. | amb+.9 col-1.1 fam-.4
- That's going to make this hard. | col-1.0 fam-.6

## character
G What do you do when you're not playing hockey?
R Fishing with my brothers. And video games, honestly.
++ Ha. Half our room plays the same games. You'll fit right in. | fam+.5 loy+.4
+ Good. You need something to switch your brain off. | pat+.4 coa+.3
? Fishing's fine. Watch the video games during the season. Sleep matters. | coa+1.0 cmp+.3 con-.7 fam-.3
- At this level, hockey has to be your whole life. | fam-.8 con-.4

G Is there anything in your background we should know about?
R No. I've never been in any trouble.
++ That's what everyone told us. Your character references were the best in the class. | con+.5 loy+.5
+ Good. We did our homework, and we believe you. | loy+.4 coa+.3
? We know about the suspension last year. Tell us about it yourself. | coa+.9 cmp+.3 con-.9 loy-.4
- We'll find out either way. | loy-.9 con-.5

P Do you care about what kind of person I am off the ice?
++ More than anything. That's why we spent an hour with your coaches and your teachers. | loy+.6 fam+.5
+ Absolutely. We want good people in our room, not just good players. | loy+.5 coa+.3
? We care how you play. Off the ice is your business, as long as you're professional. | con+1.0 cmp+.4 loy-.8 fam-.7
- Honestly, we care about the hockey. | loy-.8 fam-.5

G How do you give back to your community?
R I coach a learn-to-skate program back home every summer.
++ That's amazing. Our foundation would love to have you involved. | fam+.5 loy+.5
+ That says a lot about you. Keep it up. | loy+.4 coa+.3
? You'll have a lot less free time as a pro. You'll need to choose. | cmp+.9 coa+.3 fam-.8
- That's nice, but your summers belong to your training now. | fam-.9 loy-.4

G What's the hardest thing you've been through?
R I broke my leg at sixteen and missed a whole season.
++ And you came back better. That's exactly the resilience we were looking for. | con+.6 loy+.4
+ That's tough. Our medical staff is one of the best, if anything ever happens again. | fam+.4 coa+.4
? Injuries change some guys. Our doctors will want to take a close look. | cmp+.9 coa+.3 con-.9
- Our medical team flagged that, honestly. | con-.9 loy-.4

P What kind of people work in your front office?
++ People who'll know your name, your family's names and your birthday. We're a family. | loy+.6 fam+.6
+ Smart, honest people. We'll always tell you the truth. | coa+.5 loy+.3
? Busy people. You'll mostly deal with the development staff. | cmp+.8 con+.4 loy-.8 fam-.4
- It's a business. People come and go. | loy-.9 fam-.5

G What's one thing your coaches don't know about you?
R I write down every goal I've ever scored in a notebook.
++ Ha! Bring the notebook to camp. We want to see it get a lot fuller. | con+.5 fam+.4
+ That's a great habit. Shows you care about the details. | coa+.4 loy+.3
? Goals are great. Write down your plus-minus too. | cmp+1.0 coa+.4 con-.8
- That's a little strange, but okay. | con-.8 fam-.3

P Do you guys mind if I'm a bit of a character in the room?
++ We love it. Every winning room has a guy who keeps it loose. | con+.6 loy+.3
+ As long as you're working, have fun. That's the deal. | coa+.4 cmp+.3
? Read the room first. Rookies who talk too much get humbled fast. | coa+1.0 pat+.4 con-.9
- Keep your head down your first year. | con-.8 loy-.3 fam-.2

G What would you do if you weren't playing hockey?
R Probably go to school for engineering. My mom's an engineer.
++ Smart kid. That brain is a big part of how you read the game. | con+.5 fam+.4 col+.3
+ Good to have a plan. But we think you'll be playing for a long time. | col+.4 loy+.3
? Engineering? You might have to choose sooner than you think. | amb+.9 col-1.0 fam-.3
- Let's hope it doesn't come to that. | con-.8 fam-.3

G Who would you call first after tonight?
R My junior coach. He's the reason I'm here.
++ Tell him we said thank you. We're going to keep that relationship going. | loy+.6 fam+.3
+ Good choice. Loyalty like that is rare. | loy+.5 coa+.3
? Your junior coach is history now. Your new coaches are the ones who matter. | coa+.9 cmp+.4 loy-1.0 fam-.3
- Call your agent first. We have things to discuss. | loy-.9 fam-.5

P Is it okay to be nervous right now?
@ age=young
++ Totally. I was nervous on my first day here too. Enjoy every second of it. | fam+.5 loy+.4 pat+.3
+ Of course. Everyone on that stage tonight is nervous. | fam+.4 coa+.3
? Be nervous tonight. By camp, we need you ready to go. | cmp+1.0 coa+.3 fam-.5 pat-.3
- Nerves are a sign you're not ready. Work on that. | con-.9 fam-.4

G How do you want to be remembered as a player?
R As a guy who made everyone around him better.
++ That's the kind of player who wins Cups. We're going to love having you. | loy+.6 con+.4
+ That's a great goal. Start with your linemates at camp. | coa+.5 cmp+.3
? Making others better is great. Making yourself better comes first. | cmp+1.0 amb+.4 loy-.6 coa-.2
- Let's worry about making the team first. | con-.8 amb-.4

## pro
P Would you be upset if I played all four years of college?
@ league=NCAA,NCAA_BOUND
++ Not at all. Some of the best players in this league did four years. We'll be at every game. | col+.8 pat+.4 loy+.3
+ We'd rather have you sooner, but we'll respect whatever you and your coaches decide. | col+.5 coa+.3
? Upset? No. But four years is a long time to watch other guys take your spot. | amb+.9 cmp+.3 col-1.0
- Honestly, yes. Players who stay four years usually don't sign. | col-1.0 loy-.6

G What do your college coaches want for you?
@ league=NCAA,NCAA_BOUND
R They want me back next year to be a top-line guy and maybe captain.
++ That sounds like a great plan. A big year there makes your jump easier. | col+.7 pat+.5 loy+.3
+ We'll talk to them. We want to work with your coaches, not against them. | col+.4 coa+.4
? Being a top-line college player is great, but our top line is a lot harder. | amb+1.0 cmp+.3 col-.9
- College coaches always want their best players back. Don't let that decide for you. | col-.9 loy-.5 fam-.2

P Is the college hockey route respected in your organization?
@ league=NCAA,NCAA_BOUND
++ Very much. Half our development staff played college hockey, including me. | col+.8 loy+.4
+ Absolutely. Some of our best players came through college. | col+.5 coa+.3
? It's respected, but we like guys who are in a hurry. | amb+.9 cmp+.4 col-.9
- We prefer junior, honestly. More games, more pro-style schedule. | col-1.0 loy-.4 | ncaa+.2

G If a pro offer came after your first college season, would you take it?
@ league=NCAA,NCAA_BOUND
R Probably, if the team thought I was ready.
++ Then let's get you ready. We'll be in touch with your college staff all year. | amb+.6 coa+.4
+ Good to know. We'll stay in close contact and decide together. | coa+.4 pat+.4
? Don't decide yet. Take the year, see how it feels. | pat+.9 col+.4 amb-.8
- We'll see if you're worth an offer by then. | con-.9 loy-.5

## direction
P Are you trying to win the Cup next season?
@ role=contend
++ Yes, and a young player who can give us energy minutes might be a big piece of it. | amb+.6 cmp+.4 | contend+.3
+ We're close. You'd get to learn from a team that expects to win. | coa+.5 loy+.3
? We're trying to win now. Prospects aren't a priority this season. | pat+1.2 con+.4 amb-1.2
- Honestly, rookies don't really play on teams like ours. | amb-.8 con-.6 | deep+.2

G You know we're retooling. Does that bother you?
@ role=retool
R No. It sounds like there might be a spot for a young guy.
++ Exactly. That's why you're here. We want young players to take spots. | amb+.6 con+.4 | thin+.2
+ There will be opportunities. We'll be honest with you about where you stand. | coa+.4 loy+.4
? There will be spots. There'll also be a lot of guys fighting for them. | cmp+1.1 con+.4 pat-.5 loy-.5
- We're still figuring out what we are. Hard to make promises. | con-.8 loy-.5

## pressure
G Have you ever played in front of a sold-out crowd?
R At the World Juniors. Nineteen thousand. I'll never forget it.
++ Then you're ready for our building. Every night feels like that here. | con+.6 amb+.4
+ That's great experience. It helps when you get to the big stage. | coa+.4 loy+.3
? World Juniors is one tournament. Our building does it forty-one nights a year. | cmp+1.0 con-.7 pat+.2
- We noticed you struggled a bit at that tournament. | con-.9 loy-.4

P What if I struggle my first season?
++ Then we'll fix it together. We've drafted you for the next fifteen years, not fifteen games. | loy+.6 pat+.4 fam+.3
+ Everyone struggles. We'll give you the tools and the time. | coa+.5 pat+.4
? Then you go down and fix it. That's what the AHL is for. | cmp+.9 pat+.4 amb-.8 con-.3
- That's on you. We expect results. | con-.9 loy-.5 fam-.3

## work
P Do you track how hard players work?
++ Yes, and guys who outwork everyone get rewarded here. Ask our captain. | cmp+.6 amb+.4
+ We track everything: sleep, workload, skating numbers. It helps you get better. | coa+.6 pat+.2
? We track it all. If you're coasting, we'll know. | cmp+1.0 con+.3 fam-.4 coa-.4
- We don't really have time to micromanage prospects. | coa-.7 loy-.4

## leadership
P Can I wear my junior number?
++ It's yours. We already checked with the equipment manager. | loy+.5 con+.4 fam+.3
+ We'll make it happen, if it's open when you make the team. | loy+.4 coa+.3
? Numbers are earned around here. Take what we give you for now. | cmp+1.0 coa+.4 con-.8 loy-.3
- That number is retired, so you'll need a new one. | loy-.7 fam-.4

## family
G Will your family come to your games?
R Every one they can. My parents have driven to every road game since peewee.
++ They'll have tickets for every home game. We want them around. | fam+.7 loy+.4
+ We'll take care of them when they visit. Family matters to us. | fam+.5 loy+.3
? Pro hockey is a little different. You'll have to grow up on your own. | con+.9 cmp+.3 fam-1.0
- That's a long drive. You might not see them as much. | fam-.9 loy-.3

P Can my billet family come to camp?
@ league=CHL
++ Absolutely. Bring them to the scrimmage. We'll set up seats. | fam+.6 loy+.5
+ Sure. We'll give them a call this week. | fam+.4 coa+.3
? Camp's a business trip. Keep the focus on hockey. | cmp+1.0 con+.3 fam-.9
- Probably not. It's a closed camp. | fam-.8 loy-.4

## europe
G Would you move over here if your family couldn't come?
@ league=EURO
R It would be hard, but yes. This is my dream.
++ We'll make it easier. Flights home at Christmas, and your family can visit anytime. | fam+.7 loy+.4 | euro+.3
+ We'll help you settle. Lots of players have done it, and we'll be there for you. | fam+.4 coa+.4
? It's lonely at first. Some guys handle it and some don't. | con+.9 cmp+.4 fam-.9
- That's part of the job. Everyone goes through it. | fam-.9 loy-.4

## contract
G What would it take for you to sign this summer?
R Knowing there's a real plan for me. Not just a contract.
++ There's a plan, and it has your name on it. We'll walk you through every step. | coa+.5 loy+.5 pat+.2
+ Fair. We'll put it in writing with your agent this week. | coa+.4 con+.3
? The plan is: show up and play well. The rest takes care of itself. | cmp+1.0 con+.4 coa-.7
- Every player has the same plan at first. | loy-.8 con-.5

P Would you give me a bonus if I make the team out of camp?
++ Absolutely. Make the team and you'll be paid like it. | amb+.6 con+.4 | top+.3
+ Bonuses are standard in entry-level deals. We'll make yours fair. | coa+.4 loy+.3
? The bonus is making the team. That's what you should be chasing. | cmp+1.0 con-.6 amb-.3
- Bonuses are for proven players. | amb-.8 con-.5

## character
G Who's the funniest guy on your junior team?
@ league=CHL
R Probably me, honestly.
++ Good! Our room needs a guy like that. | con+.5 fam+.4
+ That's great. Keep it light, but keep working. | coa+.4 loy+.3
? Funny's great until you're a minus-three. Be careful. | cmp+1.0 coa+.3 con-.8
- Our room is pretty serious. Keep that in mind. | con-.8 fam-.4

## idols
P Did you ever watch me play?
++ Every scout we have watched you, and so did I. Twice in person. | con+.6 loy+.4
+ Yes. I was there for your playoff run. You were great. | con+.4 loy+.3
? Video, mostly. You'll have to show me in person. | cmp+1.0 coa+.3 con-.8
- Honestly, no. I trust my scouts. | con-.8 loy-.6
