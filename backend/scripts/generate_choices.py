"""Generate Detroit-style branching choices for all books, with user votes and stats."""
import random
import uuid
from pymongo import MongoClient

random.seed(42)
client = MongoClient("mongodb://localhost:27017")
db = client["booky"]

USERS = {
    "me": "Hunjun Shin",
    "friend-alex": "Alex Kim",
    "friend-mina": "Mina Park",
    "friend-jake": "Jake Lee",
    "friend-sofia": "Sofia Chen",
    "friend-ryan": "Ryan Oh",
}

# Choices per book — each at a specific chapter end
BOOK_CHOICES = {
    "great-gatsby": [
        {
            "chapterNum": 2,
            "question": "Tom takes Nick to meet Myrtle in the Valley of Ashes. What would you do?",
            "context": "Tom Buchanan is having an affair with Myrtle Wilson. He drags Nick along to their secret apartment in New York.",
            "options": [
                {"id": "a", "text": "Trust Tom", "description": "Go along with it. Tom is family, and maybe there's more to the story."},
                {"id": "b", "text": "Doubt Tom", "description": "This feels wrong. You can't trust a man who cheats so openly."},
            ],
        },
        {
            "chapterNum": 3,
            "question": "You've just attended Gatsby's legendary party. A stranger invites you to a private meeting with the host. Do you go?",
            "context": "Gatsby's parties are wild, extravagant affairs. Nobody seems to actually know the host. Jordan Baker hints that Gatsby has been asking about you.",
            "options": [
                {"id": "a", "text": "Confront", "description": "Go meet him and ask directly who he really is and what he wants."},
                {"id": "b", "text": "Observe", "description": "Keep your distance. Watch and learn before getting involved."},
            ],
        },
        {
            "chapterNum": 5,
            "question": "Gatsby has finally reunited with Daisy. But Tom is growing suspicious. Do you stay and face the confrontation, or leave before it gets worse?",
            "context": "The tension between Gatsby and Tom is building. Daisy is caught in the middle. You sense something terrible is about to happen.",
            "options": [
                {"id": "a", "text": "Stay and fight", "description": "Running away doesn't solve anything. Gatsby already tried that."},
                {"id": "b", "text": "Leave quietly", "description": "This isn't your battle. Sometimes the wisest move is to step back."},
            ],
        },
        {
            "chapterNum": 7,
            "question": "After the Plaza Hotel confrontation, Daisy drives Gatsby's car and hits Myrtle. Gatsby says he'll take the blame. What would you advise?",
            "context": "Myrtle Wilson is dead. Gatsby is willing to sacrifice himself for Daisy. Tom is furious and dangerous.",
            "options": [
                {"id": "a", "text": "Tell the truth", "description": "The truth always comes out. Covering up will only make things worse."},
                {"id": "b", "text": "Protect Daisy", "description": "Gatsby loves her. Sometimes love means bearing someone else's burden."},
            ],
        },
    ],
    "1984": [
        {
            "chapterNum": 2,
            "question": "Julia slips you a secret note that says 'I love you.' In a world where love is rebellion, do you trust her?",
            "context": "The Party monitors everything. Julia could be a trap set by the Thought Police, or she could be the only real person left.",
            "options": [
                {"id": "a", "text": "Trust Julia", "description": "In a world of lies, love might be the only truth worth risking everything for."},
                {"id": "b", "text": "Stay cautious", "description": "Trust no one. The Party has eyes everywhere, and this could be a test."},
            ],
        },
        {
            "chapterNum": 5,
            "question": "O'Brien invites you to join the Brotherhood — a secret resistance against Big Brother. Do you accept?",
            "context": "O'Brien seems like an ally, but in Oceania, nothing is what it seems. Joining means there's no going back.",
            "options": [
                {"id": "a", "text": "Join the Brotherhood", "description": "Freedom is worth any risk. If not now, when?"},
                {"id": "b", "text": "Decline politely", "description": "Survival comes first. You can resist in your own quiet way."},
            ],
        },
        {
            "chapterNum": 7,
            "question": "You're captured by the Thought Police. In Room 101, they threaten you with your worst fear. Do you betray the person you love?",
            "context": "Room 101 holds your deepest terror. They say if you name someone else, the punishment transfers to them.",
            "options": [
                {"id": "a", "text": "Stay silent", "description": "Some things are more important than survival. Love is one of them."},
                {"id": "b", "text": "Betray to survive", "description": "Everyone breaks. You can't fight biology. Forgive yourself later."},
            ],
        },
    ],
    "pride-prejudice": [
        {
            "chapterNum": 2,
            "question": "Mr. Darcy has just insulted Elizabeth at the ball, calling her 'tolerable.' How do you react?",
            "context": "The Meryton ball. Everyone is watching. Darcy's pride is on full display.",
            "options": [
                {"id": "a", "text": "Laugh it off", "description": "His opinion means nothing. Let your wit be your armor."},
                {"id": "b", "text": "Confront him", "description": "Nobody gets to dismiss you like that. Stand your ground."},
            ],
        },
        {
            "chapterNum": 4,
            "question": "Mr. Wickham tells you Darcy cheated him out of his inheritance. Do you believe him?",
            "context": "Wickham is charming and sympathetic. But you've only heard one side of the story.",
            "options": [
                {"id": "a", "text": "Believe Wickham", "description": "He seems honest, and Darcy is clearly arrogant enough to do it."},
                {"id": "b", "text": "Reserve judgment", "description": "Charming people aren't always truthful. Wait for more evidence."},
            ],
        },
        {
            "chapterNum": 6,
            "question": "Darcy has just proposed — but insulted your family in the process. He says he loves you despite your inferior connections. What do you say?",
            "context": "Darcy's proposal is passionate but deeply offensive. He clearly expects you to accept.",
            "options": [
                {"id": "a", "text": "Reject firmly", "description": "Love without respect is worthless. He needs to hear the truth."},
                {"id": "b", "text": "Hear him out", "description": "His words are clumsy, but maybe his feelings are genuine underneath."},
            ],
        },
    ],
    "frankenstein": [
        {
            "chapterNum": 3,
            "question": "You've just discovered the secret of creating life. Do you proceed with the experiment?",
            "context": "Victor Frankenstein stands at the threshold of playing God. The knowledge is intoxicating, but something feels deeply wrong.",
            "options": [
                {"id": "a", "text": "Create the creature", "description": "Science demands courage. This could change everything about what it means to be human."},
                {"id": "b", "text": "Destroy the notes", "description": "Some knowledge is too dangerous. The cost of failure could be monstrous."},
            ],
        },
        {
            "chapterNum": 5,
            "question": "The creature begs you to create a companion — someone like him who won't recoil in horror. He promises to disappear forever.",
            "context": "The creature is articulate, intelligent, and in agony. He has been rejected by every human he's met.",
            "options": [
                {"id": "a", "text": "Create a companion", "description": "Everyone deserves not to be alone. His suffering is your responsibility."},
                {"id": "b", "text": "Refuse", "description": "Two creatures could be twice the danger. You can't risk it."},
            ],
        },
    ],
    "dracula": [
        {
            "chapterNum": 2,
            "question": "You're a guest in Count Dracula's castle. Strange things are happening at night. Do you investigate or stay in your room?",
            "context": "Jonathan Harker notices the Count never eats, the doors are locked, and something crawls down the castle walls at night.",
            "options": [
                {"id": "a", "text": "Investigate", "description": "Fear of the unknown is worse than knowing the truth. Search the castle."},
                {"id": "b", "text": "Stay put", "description": "Curiosity kills. Stay safe, keep your head down, and plan an escape."},
            ],
        },
        {
            "chapterNum": 5,
            "question": "Lucy is getting weaker despite blood transfusions. Van Helsing suggests garlic and crucifixes. Do you trust his unorthodox methods?",
            "context": "Modern medicine is failing. Van Helsing's suggestions sound like superstition, but he's the only one with answers.",
            "options": [
                {"id": "a", "text": "Trust Van Helsing", "description": "Desperate times call for desperate measures. Science doesn't explain everything."},
                {"id": "b", "text": "Seek a real doctor", "description": "Garlic and crosses? This is the 19th century. Get proper medical help."},
            ],
        },
    ],
    "alice-wonderland": [
        {
            "chapterNum": 2,
            "question": "You've fallen down the rabbit hole. A bottle says 'DRINK ME.' Do you?",
            "context": "Nothing in Wonderland makes sense. The bottle could be poison, or it could be the key to moving forward.",
            "options": [
                {"id": "a", "text": "Drink it", "description": "You're already in Wonderland. What's the worst that could happen?"},
                {"id": "b", "text": "Don't drink", "description": "Drinking unknown liquids is never wise, even in a fantasy world."},
            ],
        },
        {
            "chapterNum": 5,
            "question": "The Cheshire Cat offers to show you two paths: one to the Mad Hatter, one to the March Hare. 'They're both mad,' he says.",
            "context": "You're lost in Wonderland. The Cat grins. Both destinations sound equally insane.",
            "options": [
                {"id": "a", "text": "Mad Hatter", "description": "A mad hatter sounds like he might at least have tea."},
                {"id": "b", "text": "March Hare", "description": "Spring madness might be more fun than hat madness."},
            ],
        },
    ],
    "romeo-juliet": [
        {
            "chapterNum": 2,
            "question": "You've just fallen in love with someone from the enemy family. Do you pursue it or walk away?",
            "context": "The balcony scene. Romeo and Juliet have just discovered each other's identity. The feud between Montagues and Capulets has killed many.",
            "options": [
                {"id": "a", "text": "Pursue love", "description": "Love transcends family feuds. Some things are worth any risk."},
                {"id": "b", "text": "Walk away", "description": "This can only end in tragedy. Protect yourself and your family."},
            ],
        },
        {
            "chapterNum": 5,
            "question": "Tybalt has killed Mercutio. Romeo must decide: avenge his friend or keep the peace for Juliet's sake.",
            "context": "Mercutio is dead. Tybalt, Juliet's cousin, is the killer. Romeo is torn between love and honor.",
            "options": [
                {"id": "a", "text": "Avenge Mercutio", "description": "A friend's death cannot go unanswered. Honor demands justice."},
                {"id": "b", "text": "Keep the peace", "description": "More violence won't bring Mercutio back. Think of Juliet."},
            ],
        },
    ],
    "sherlock-holmes": [
        {
            "chapterNum": 2,
            "question": "A mysterious client offers Holmes a case but refuses to give their real name. Do you take the case?",
            "context": "The client is clearly wealthy and terrified. Their hands are trembling. Something doesn't add up.",
            "options": [
                {"id": "a", "text": "Take the case", "description": "The mystery itself is the reward. Anonymous clients often have the best stories."},
                {"id": "b", "text": "Demand honesty", "description": "Trust is the foundation. No identity, no case."},
            ],
        },
        {
            "chapterNum": 5,
            "question": "You've identified the culprit, but arresting them would expose an innocent person's secret. Do you reveal everything?",
            "context": "Justice and mercy are at odds. The truth would solve the case but ruin a bystander's life.",
            "options": [
                {"id": "a", "text": "Reveal all", "description": "Justice must be blind. The truth is the truth, regardless of consequences."},
                {"id": "b", "text": "Find another way", "description": "A good detective serves justice, not just truth. Protect the innocent."},
            ],
        },
    ],
}


def main():
    db.choices.delete_many({})
    db.user_choices.delete_many({})
    total_choices = 0
    total_votes = 0

    for book_id, choices in BOOK_CHOICES.items():
        for choice_data in choices:
            choice_id = str(uuid.uuid4())
            ch = choice_data["chapterNum"]

            # Generate user votes
            votes = []
            option_counts = {"a": 0, "b": 0}

            for uid, uname in USERS.items():
                # Check if user has read this chapter
                prog = db.reading_progress.find_one({"_id": f"{uid}_{book_id}"})
                if not prog or prog.get("currentChapter", 0) < ch:
                    continue

                picked = random.choice(["a", "b"])
                option_counts[picked] += 1
                comment = random.choice([
                    "This felt like the only real option.",
                    "I went with my gut on this one.",
                    "Tough call, but I stand by it.",
                    "I'd pick the same thing again.",
                    "This was the hardest choice so far.",
                    "",
                    "",
                ])
                votes.append({
                    "userId": uid,
                    "userName": uname,
                    "optionId": picked,
                    "comment": comment,
                })

                # Store individual user choice
                db.user_choices.insert_one({
                    "_id": f"{uid}_{choice_id}",
                    "userId": uid,
                    "choiceId": choice_id,
                    "bookId": book_id,
                    "chapterNum": ch,
                    "optionId": picked,
                    "comment": comment,
                })
                total_votes += 1

            total_voters = sum(option_counts.values())
            stats = {}
            for opt in choice_data["options"]:
                oid = opt["id"]
                count = option_counts.get(oid, 0)
                pct = round(count / total_voters * 100) if total_voters > 0 else 0
                voters = [v for v in votes if v["optionId"] == oid]
                stats[oid] = {"percentage": pct, "count": count, "voters": voters}

            # My choice
            my_vote = next((v for v in votes if v["userId"] == "me"), None)

            choice_doc = {
                "_id": choice_id,
                "bookId": book_id,
                "chapterNum": ch,
                "question": choice_data["question"],
                "context": choice_data["context"],
                "options": choice_data["options"],
                "stats": stats,
                "myChoice": my_vote["optionId"] if my_vote else "",
                "totalVotes": total_voters,
            }
            db.choices.insert_one(choice_doc)
            total_choices += 1

    print(f"Generated {total_choices} choices with {total_votes} votes.")
    for book_id in BOOK_CHOICES:
        count = db.choices.count_documents({"bookId": book_id})
        print(f"  {book_id}: {count} choice points")


if __name__ == "__main__":
    main()
