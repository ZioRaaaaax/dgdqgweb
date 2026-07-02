import "dotenv/config";

const commands = [
  {
    name: "mode",
    description: "Changer le mode du site Snapchat+",
    options: [
      {
        type: 3,
        name: "type",
        description: "Mode à activer",
        required: true,
        choices: [
          { name: "normal", value: "normal" },
          { name: "nuit (indisponible)", value: "maintenance" },
        ],
      },
    ],
  },
];

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!applicationId || !botToken) {
  console.error("DISCORD_APPLICATION_ID et DISCORD_BOT_TOKEN sont requis.");
  process.exit(1);
}

const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!response.ok) {
  console.error("Échec:", await response.text());
  process.exit(1);
}

const registered = await response.json();
console.log("Commandes enregistrées :", registered.map((cmd) => `/${cmd.name}`).join(", "));
