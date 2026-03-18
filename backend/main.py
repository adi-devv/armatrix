from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid

app = FastAPI(title="Armatrix Team API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TeamMember(BaseModel):
    name: str
    role: str
    bio: str
    photo_url: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    tags: Optional[list[str]] = []

class TeamMemberOut(TeamMember):
    id: str

# In-memory store
team_members: dict[str, TeamMemberOut] = {}

def seed_data():
    members = [
        {
            "name": "Aadit Singal",
            "role": "CEO",
            "bio": "Writes code so clean it squeaks. Allegedly fixed more bugs than he introduced last Tuesday. Fuelled entirely by chai and the fear of missing the deadline.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Aadit&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/aaditsingal",
            "twitter": "https://twitter.com/aaditsingal",
            "tags": ["React", "FastAPI", "Caffeine"]
        },
        {
            "name": "Elon Musk",
            "role": "Tunnel Guy",
            "bio": "Showed up one day insisting snake arms should also dig tunnels. Has since renamed three internal projects after his children. We let him stay because he owns the Wi-Fi router.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Elon&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/elonmusk",
            "twitter": "https://twitter.com/elonmusk",
            "tags": ["Tunnels", "Mars", "Posting Online"]
        },
        {
            "name": "Bear Grylls",
            "role": "Snake Wrangler",
            "bio": "Tests every prototype in the most inhospitable environments possible — active volcanoes, Arctic pipes, a Bengaluru auto at rush hour. Has eaten the foam insulation twice. No regrets.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Bear&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/beargrylls",
            "tags": ["Survival", "Field Testing", "Eating Weird Things"]
        },
        {
            "name": "Gordon Ramsay",
            "role": "Angry Food Man",
            "bio": "Brought in to review the soldering quality. Has called our PCB layout 'an absolute disgrace' and our cable management 'criminally disgusting.' Precision has improved 40% since.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Gordon&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/gordonramsay",
            "tags": ["Quality Control", "Very Loud Feedback", "Michelin Stars"]
        },
        {
            "name": "David Attenborough",
            "role": "The Voice of God",
            "bio": "Documents the snake arm's movement through industrial ducts with the gravitas of a BBC nature special. His voice memo field notes have become required onboarding material.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=David&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/davidattenborough",
            "tags": ["Narration", "Behavioural Analysis", "Knighted"]
        },
        {
            "name": "Sherlock Holmes",
            "role": "World's Greatest Detective",
            "bio": "Deduced the source of a firmware race condition from a faint burning smell and a slightly warm capacitor. Keeps calling the CPU 'elementary.' We have stopped arguing.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Sherlock&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/sherlockholmes221b",
            "tags": ["Root Cause Analysis", "Deduction", "Violin"]
        },
        {
            "name": "Snoop Dogg",
            "role": "Vibes Only",
            "bio": "Joined after calling our Series A pitch 'lowkey fire.' Hosts weekly standups as a rap freestyle and has not missed a single sprint review. The team velocity has never been higher.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Snoop&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/snoopdogg",
            "twitter": "https://twitter.com/snoopdogg",
            "tags": ["Vibes", "Gin & Juice", "Investor Decks"]
        },
        {
            "name": "Marie Curie",
            "role": "Double Nobel, No Big Deal",
            "bio": "Joined via an unexplained temporal anomaly and immediately flagged seven safety violations in the lab. Now leads all materials R&D. Asks us not to touch her notebooks.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Marie&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/mariecurie",
            "tags": ["Physics", "Chemistry", "Two Nobel Prizes"]
        },
        {
            "name": "Shrek",
            "role": "Swamp to Factory Pipeline",
            "bio": "It turns out ogres are perfectly built for crawl-space robotics work. Shrek navigates tight industrial ducts with surprising grace and keeps the team motivated. Onions are his performance reviews.",
            "photo_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Shrek&backgroundColor=080808",
            "linkedin": "https://linkedin.com/in/shrek-swamp",
            "tags": ["Confined Spaces", "Layers", "Motivational Speaking"]
        },
    ]
    for m in members:
        mid = str(uuid.uuid4())
        team_members[mid] = TeamMemberOut(id=mid, **m)

seed_data()

@app.get("/")
def root():
    return {"message": "Armatrix Team API", "version": "1.0.0"}

@app.get("/team", response_model=list[TeamMemberOut])
def get_team():
    return list(team_members.values())

@app.get("/team/{member_id}", response_model=TeamMemberOut)
def get_member(member_id: str):
    if member_id not in team_members:
        raise HTTPException(status_code=404, detail="Team member not found")
    return team_members[member_id]

@app.post("/team", response_model=TeamMemberOut, status_code=201)
def create_member(member: TeamMember):
    mid = str(uuid.uuid4())
    new_member = TeamMemberOut(id=mid, **member.model_dump())
    team_members[mid] = new_member
    return new_member

@app.put("/team/{member_id}", response_model=TeamMemberOut)
def update_member(member_id: str, member: TeamMember):
    if member_id not in team_members:
        raise HTTPException(status_code=404, detail="Team member not found")
    updated = TeamMemberOut(id=member_id, **member.model_dump())
    team_members[member_id] = updated
    return updated

@app.delete("/team/{member_id}")
def delete_member(member_id: str):
    if member_id not in team_members:
        raise HTTPException(status_code=404, detail="Team member not found")
    del team_members[member_id]
    return {"message": "Team member deleted"}