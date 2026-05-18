const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Events } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const DOWODY_FILE = path.join(__dirname, 'data', 'dowody.json');

// ==========================================
// KONFIGURACJA UPRAWNIEŃ I RÓL
// ==========================================
const ROLES = {
  ROLE_ADMIN: '1505995645662531855', 
  ROLE_EGZAMINATOR: '1505614464895156347',
  ROLE_TEORIA_ZDANA: '1505614464798425124'
};

const DRIVING_LICENSES = {
  'A': '1505614464798425122',
  'B': '1505614464798425121',
  'C': '1505614464798425120',
  'C+E': '1505614464798425119',
  'D': '1505614464798425118',
  'T': '1505614464781914131'
};

// Słowa kluczowe do inteligentnego szukania kanałów (ignoruje emotki i kreski ozdobne)
const CHANNEL_KEYWORDS = {
  STWORZ_DOWOD: ['stworz-dowod', 'stwórz-dowód', 'wyrob-dowod'],
  DOWOD_OSOBISTY: ['dowod-osobisty', 'dowód-osobisty'],
  ZAPISY: ['zapisy'],
  WYNIKI: ['wyniki'],
  UPDATE_EH: ['update-eh'],
  CHANGE_LOG: ['change-log'],
  URLOPY: ['urlopy', 'urlopy-dc'],
  AWANSE_DEGRADACJE: ['awanse-degrad', 'awanse-degradacje'],
  PLUSY_MINUSY: ['plusy-minusy'],
  ZAWIESZENIA: ['zawieszenia']
};

function ensureDowodyFile() {
  const dir = path.dirname(DOWODY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DOWODY_FILE)) fs.writeFileSync(DOWODY_FILE, JSON.stringify({}, null, 2));
}

function loadDowody() {
  ensureDowodyFile();
  try {
    return JSON.parse(fs.readFileSync(DOWODY_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDowody(data) {
  fs.writeFileSync(DOWODY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Funkcja czyszcząca nazwy kanałów z ozdobników, spacji i emotek, aby bot zawsze trafił w odpowiednie miejsce
function findChannelByKeywords(guild, keywords) {
  return guild.channels.cache.find(channel => {
    if (!channel.isTextBased()) return false;
    const cleanName = channel.name.toLowerCase().replace(/[^a-z0-9-+]/g, '');
    return keywords.some(keyword => cleanName.includes(keyword.replace(/[^a-z0-9-+]/g, '')));
  });
}

function checkAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.has(ROLES.ROLE_ADMIN);
}

function checkEgzaminator(member) {
  return member.roles.cache.has(ROLES.ROLE_EGZAMINATOR) || checkAdmin(member);
}

function createEmbed({ title, description, fields = [], color = 0x2f3136, footer }) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
  if (fields.length) embed.addFields(fields);
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, () => {
  console.log(`Bot pomyślnie uruchomiony jako: ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    const { member, guild } = interaction;
    if (!guild) return;

    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;
      const targetUser = options.getUser('uzytkownik');
      const targetMember = targetUser ? await guild.members.fetch(targetUser.id).catch(() => null) : null;

      // 1. OBSŁUGA KOMENDY /DOWOD
      if (commandName === 'dowod') {
        const subcommand = options.getSubcommand();

        if (subcommand === 'stworz') {
          const validChannel = findChannelByKeywords(guild, CHANNEL_KEYWORDS.STWORZ_DOWOD);
          if (validChannel && interaction.channelId !== validChannel.id) {
            return interaction.reply({ content: `Tej komendy możesz użyć tylko na kanale <#${validChannel.id}>.`, ephemeral: true });
          }

          const modal = new ModalBuilder().setCustomId('modal-dowod-rp').setTitle('Tworzenie dowodu osobistego RP');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m-imie').setLabel('Imię postaci').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m-nazwisko').setLabel('Nazwisko postaci').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m-data').setLabel('Data urodzenia (DD.MM.RRRR)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m-pochodzenie').setLabel('Pochodzenie postaci').setStyle(TextInputStyle.Short).setRequired(true))
          );
          return interaction.showModal(modal);
        }

        if (subcommand === 'pokaz') {
          if (!targetMember) return interaction.reply({ content: 'Nie odnaleziono podanego gracza.', ephemeral: true });
          const dowody = loadDowody();
          const data = dowody[targetMember.id];
          if (!data) return interaction.reply({ content: 'Ten użytkownik nie posiada wyrobionego dowodu.', ephemeral: true });

          const embed = createEmbed({
            title: '💳 DOWÓD OSOBISTY OBYWATELA',
            color: 0x3498db,
            fields: [
              { name: '👤 Imię', value: data.imie, inline: true },
              { name: '👥 Nazwisko', value: data.nazwisko, inline: true },
              { name: '📅 Data urodzenia', value: data.dataUrodzenia, inline: true },
              { name: '🌍 Pochodzenie', value: data.pochodzenie, inline: true }
            ],
            footer: `Obywatel ID: ${targetMember.id}`
          });
          return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'usun') {
          if (!checkAdmin(member)) return interaction.reply({ content: 'Brak uprawnień (Wymagany Zarząd/Admin).', ephemeral: true });
          if (!targetMember) return interaction.reply({ content: 'Nie wskazano użytkownika.', ephemeral: true });

          const dowody = loadDowody();
          if (!dowody[targetMember.id]) return interaction.reply({ content: 'Ten gracz nie ma zapisanego dowodu.', ephemeral: true });

          delete dowody[targetMember.id];
          saveDowody(dowody);
          return interaction.reply({ content: `Pomyślnie usunięto dowód tożsamości gracza ${targetMember.user.tag} (Zarejestrowano śmierć postaci / CK).` });
        }
      }

      // 2. OBSŁUGA KOMENDY /EGZAMIN
      if (commandName === 'egzamin') {
        if (!checkEgzaminator(member)) return interaction.reply({ content: 'Komenda zarezerwowana wyłącznie dla Egzaminatorów.', ephemeral: true });
        const subcommand = options.getSubcommand();

        if (subcommand === 'zapisz') {
          const kat = options.getString('kategoria');
          const channel = findChannelByKeywords(guild, CHANNEL_KEYWORDS.ZAPISY);
          
          const embed = createEmbed({
            title: '🚗 NOWY ZAPIS NA EGZAMIN',
            color: 0xf1c40f,
            description: `Kursant ${targetMember} został dodany do kolejki egzaminacyjnej.`,
            fields: [{ name: '📇 Oczekiwana Kategoria', value: `Kat. ${kat}` }]
          });

          if (channel) await channel.send({ embeds: [embed] });
          return interaction.reply({ content: `Zapisano kursanta na egzamin kategorii ${kat}. Log wysłany.`, ephemeral: true });
        }

        if (subcommand === 'teoria') {
          const wynik = options.getString('wynik');
          const channel = findChannelByKeywords(guild, CHANNEL_KEYWORDS.WYNIKI);
          const status = wynik === 'zdany';

          const embed = createEmbed({
            title: '📝 WYNIK EGZAMINU TEORETYCZNEGO',
            color: status ? 0x2ecc71 : 0xe74c3c,
            description: `Kursant: ${targetMember}\nWynik części teoretycznej: **${wynik.toUpperCase()}**`
          });

          if (channel) await channel.send({ embeds: [embed] });
          if (status) {
            const rolaTeorii = guild.roles.cache.get(ROLES.ROLE_TEORIA_ZDANA);
            if (rolaTeorii) await targetMember.roles.add(rolaTeorii).catch(() => null);
          }
          return interaction.reply({ content: 'Wynik teorii pomyślnie dodany do arkusza.', ephemeral: true });
        }

        if (subcommand === 'praktyka') {
          const kat = options.getString('kategoria');
          const wynik = options.getString('wynik');
          const uwagi = options.getString('uwagi');
          const channel = findChannelByKeywords(guild, CHANNEL_KEYWORDS.WYNIKI);
          const status = wynik === 'zdany';

          const embed = createEmbed({
            title: `🎬 WYNIK EGZAMINU PRAKTYCZNEGO: KAT. ${kat}`,
            color: status ? 0x2ecc71 : 0xe74c3c,
            fields: [
              { name: '👤 Kursant', value: `${targetMember}`, inline: true },
              { name: '📊 Wynik', value: `**${wynik.toUpperCase()}**`, inline: true },
              { name: 'ℹ️ Notatka Egzaminatora', value: uwagi }
            ]
          });

          if (channel) await channel.send({ embeds: [embed] });

          if (status) {
            const roleId = DRIVING_LICENSES[kat];
            if (roleId) {
              const rolaKat = guild.roles.cache.get(roleId);
              if (rolaKat) await targetMember.roles.add(rolaKat).catch(() => null);
            }
            const rolaTeorii = guild.roles.cache.get(ROLES.ROLE_TEORIA_ZDANA);
            if (rolaTeorii) await targetMember.roles.remove(rolaTeorii).catch(() => null);
          }
          return interaction.reply({ content: 'Egzamin praktyczny został podsumowany w bazie i logach.', ephemeral: true });
        }
      }

      // 3. OBSŁUGA KOMEND ADMINISTRACYJNYCH
      if (commandName === 'ogloszenie') {
        if (!checkAdmin(member)) return interaction.reply({ content: 'Brak uprawnień.', ephemeral: true });
        const typ = options.getString('typ');
        const tresc = options.getString('tresc');

        const channelKeywords = typ === 'gra' ? CHANNEL_KEYWORDS.UPDATE_EH : CHANNEL_KEYWORDS.CHANGE_LOG;
        const channel = findChannelByKeywords(guild, channelKeywords);

        if (!channel) return interaction.reply({ content: 'Nie znaleziono odpowiedniego kanału dla ogłoszeń.', ephemeral: true });

        const embed = createEmbed({
          title: typ === 'gra' ? '📢 AKTUALIZACJE WYSPY (IC)' : '📢 ZMIANY DISCORD (OOC)',
          color: typ === 'gra' ? 0x9b59b6 : 0x1abc9c,
          description: tresc,
          footer: `Wysłane przez: ${interaction.user.tag}`
        });

        await channel.send({ embeds: [embed] });
        return interaction.reply({ content: 'Ogłoszenie zostało opublikowane.', ephemeral: true });
      }

      if (commandName === 'urlop') {
        const od = options.getString('od');
        const doDate = options.getString('do');
        const powod = options.getString('powod');
        const channel = findChannelByKeywords(guild, CHANNEL_KEYWORDS.URLOPY);

        if (!channel) return interaction.reply({ content: 'Nie znaleziono odpowiedniego kanału dla urlopów.', ephemeral: true });

        const embed = createEmbed({
          title: '📅 ZGŁOSZENIE URLOPU PRZEZ CZŁONKA EKIPY',
          color: 0xe67e22,
          fields: [
            { name: '👤 Pracownik', value: `${interaction.user}`, inline: true },
            { name: '⏳ Czas Trwania', value: `Od ${od} do ${doDate}`, inline: true },
            { name: '❓ Powód', value: powod }
          ]
        });

        await channel.send({ embeds: [embed] });
        
        const currentName = member.displayName;
        if (!currentName.startsWith('[URLOP]')) {
          await member.setNickname(`[URLOP] ${currentName}`).catch(() => null);
        }
        return interaction.reply({ content: 'Urlop pomyślnie zapisany w systemie kadrowym.', ephemeral: true });
      }

      if (commandName === 'awans' || commandName === 'degrad') {
        if (!checkAdmin(member)) return interaction.reply({ content: 'Brak uprawnień kadrowych.', ephemeral: true });
        const nowaRanga = options.getString('nowa_ranga');
        const isAwans = commandName === 'awans';
        const channel = findChannelByKeywords(guild, CHANNEL_KEYWORDS.AWANSE_DEGRADACJE);

        if (!channel) return interaction.reply({ content: 'Brak kanału kadrowego awansów/degradacji.', ephemeral: true });

        const embed = createEmbed({
          title: isAwans ? '📈 ZMIANY KADROWE: AWANS SŁUŻBOWY' : '📉 ZMIANY KADROWE: DEGRADACJA SŁUŻBOWA',
          color: isAwans ? 0x2ecc71 : 0xe74c3c,
          description: `Funkcjonariusz/Pracownik: ${targetMember}\nNowy stopień służbowy: **${nowaRanga}**`,
          footer: `Zatwierdził: ${interaction.user.tag}`
        });

        await channel.send({ embeds: [embed] });
        return interaction.reply({ content: 'Zmiana stopnia została opublikowana.', ephemeral: true });
      }

      if (commandName === 'kara') {
        if (!checkAdmin(member)) return interaction.reply({ content: 'Brak uprawnień moderskich.', ephemeral: true });
        const typ = options.getString('typ');
        const powod = options.getString('powod');

        // TU BYŁ BŁĄD LOGICZNY - NAPRAWIONE:
        const channelKeywords = typ === 'zawieszenie' ? CHANNEL_KEYWORDS.ZAWIESZENIA : CHANNEL_KEYWORDS.PLUSY_MINUSY;
        const channel = findChannelByKeywords(guild, channelKeywords);

        if (!channel) return interaction.reply({ content: 'Nie zlokalizowano właściwego kanału kar.', ephemeral: true });

        const embed = createEmbed({
          title: typ === 'zawieszenie' ? '⛔ ZAWIESZENIE PRACOWNIKA' : '⚠️ WPIS DYSCYPLINARNY',
          color: typ === 'zawieszenie' ? 0xce1126 : 0xf39c12,
          fields: [
            { name: '👤 Ukarany', value: `${targetMember}`, inline: true },
            { name: '🚫 Typ Kary', value: typ.toUpperCase(), inline: true },
            { name: '📝 Powód nałożenia kary', value: powod }
          ],
          footer: `Wystawił: ${interaction.user.tag}`
        });

        await channel.send({ embeds: [embed] });
        return interaction.reply({ content: 'Kara dyscyplinarna została pomyślnie nałożona.', ephemeral: true });
      }
    }

    // 4. OBSŁUGA ZATWIERDZANIA OKIEN MODALNYCH (MODAL SUBMIT)
    if (interaction.isModalSubmit() && interaction.customId === 'modal-dowod-rp') {
      const imie = interaction.fields.getTextInputValue('m-imie');
      const nazwisko = interaction.fields.getTextInputValue('m-nazwisko');
      const dataUrodzenia = interaction.fields.getTextInputValue('m-data');
      const pochodzenie = interaction.fields.getTextInputValue('m-pochodzenie');

      const dowody = loadDowody();
      dowody[interaction.user.id] = { imie, nazwisko, dataUrodzenia, pochodzenie, createdAt: new Date().toISOString() };
      saveDowody(dowody);

      const targetChannel = findChannelByKeywords(guild, CHANNEL_KEYWORDS.DOWOD_OSOBISTY);
      if (!targetChannel) return interaction.reply({ content: 'Błąd systemu: nie znaleziono kanału docelowego dla dowodów.', ephemeral: true });

      const embed = createEmbed({
        title: '💳 WYGENEROWANO NOWY DOWÓD OSOBISTY',
        color: 0x2ecc71,
        description: `Właścicielem dokumentu staje się: ${interaction.user}`,
        fields: [
          { name: '👤 Imię', value: imie, inline: true },
          { name: '👥 Nazwisko', value: nazwisko, inline: true },
          { name: '📅 Data urodzenia', value: dataUrodzenia, inline: true },
          { name: '🌍 Pochodzenie', value: pochodzenie, inline: true }
        ],
        footer: `Obywatel ID: ${interaction.user.id}`
      });

      await targetChannel.send({ embeds: [embed] });
      return interaction.reply({ content: 'Twój dowód osobisty został pomyślnie wyrobiony i przesłany do urzędu!', ephemeral: true });
    }
  } catch (error) {
    console.error('Wystąpił błąd podczas interakcji bota:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
