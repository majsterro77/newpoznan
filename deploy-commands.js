const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID
};

const commands = [
  new SlashCommandBuilder()
    .setName('dowod')
    .setDescription('Zarządzaj dowodami RP')
    .addSubcommand(subcommand =>
      subcommand
        .setName('stworz')
        .setDescription('Stwórz dowód osobisty RP'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('pokaz')
        .setDescription('Pokaż dowód wybranego gracza')
        .addUserOption(option =>
          option.setName('uzytkownik')
            .setDescription('Użytkownik, którego dowód chcesz zobaczyć')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('usun')
        .setDescription('Usuń dowód postaci (CK)')
        .addUserOption(option =>
          option.setName('uzytkownik')
            .setDescription('Użytkownik, którego dowód chcesz usunąć')
            .setRequired(true))),

  new SlashCommandBuilder()
    .setName('egzamin')
    .setDescription('Zarządzaj egzaminami prawa jazdy')
    .addSubcommand(subcommand =>
      subcommand
        .setName('zapisz')
        .setDescription('Zapisz kursanta na egzamin')
        .addUserOption(option =>
          option.setName('uzytkownik')
            .setDescription('Kursant')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('kategoria')
            .setDescription('Kategoria prawa jazdy')
            .setRequired(true)
            .addChoices(
              { name: 'A', value: 'A' },
              { name: 'B', value: 'B' },
              { name: 'C', value: 'C' },
              { name: 'C+E', value: 'C+E' },
              { name: 'D', value: 'D' },
              { name: 'T', value: 'T' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('teoria')
        .setDescription('Wprowadź wynik egzaminu teoretycznego')
        .addUserOption(option =>
          option.setName('uzytkownik')
            .setDescription('Kursant')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('wynik')
            .setDescription('Wynik egzaminu')
            .setRequired(true)
            .addChoices(
              { name: 'zdany', value: 'zdany' },
              { name: 'niezdany', value: 'niezdany' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('praktyka')
        .setDescription('Wprowadź wynik egzaminu praktycznego')
        .addUserOption(option =>
          option.setName('uzytkownik')
            .setDescription('Kursant')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('kategoria')
            .setDescription('Kategoria prawa jazdy')
            .setRequired(true)
            .addChoices(
              { name: 'A', value: 'A' },
              { name: 'B', value: 'B' },
              { name: 'C', value: 'C' },
              { name: 'C+E', value: 'C+E' },
              { name: 'D', value: 'D' },
              { name: 'T', value: 'T' }
            ))
        .addStringOption(option =>
          option.setName('wynik')
            .setDescription('Wynik egzaminu')
            .setRequired(true)
            .addChoices(
              { name: 'zdany', value: 'zdany' },
              { name: 'niezdany', value: 'niezdany' }
            ))
        .addStringOption(option =>
          option.setName('uwagi')
            .setDescription('Uwagi do egzaminu')
            .setRequired(true))),

  new SlashCommandBuilder()
    .setName('ogloszenie')
    .setDescription('Opublikuj ogłoszenie administracyjne')
    .addStringOption(option =>
      option.setName('typ')
        .setDescription('Typ ogłoszenia')
        .setRequired(true)
        .addChoices(
          { name: 'gra', value: 'gra' },
          { name: 'discord', value: 'discord' }
        ))
    .addStringOption(option =>
      option.setName('tresc')
        .setDescription('Treść ogłoszenia')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('urlop')
    .setDescription('Zgłoś urlop administracyjny/frakcyjny')
    .addStringOption(option =>
      option.setName('od')
        .setDescription('Data rozpoczęcia urlopu')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('do')
        .setDescription('Data zakończenia urlopu')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('powod')
        .setDescription('Powód urlopu')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('awans')
    .setDescription('Zgłoś awans użytkownika')
    .addUserOption(option =>
      option.setName('uzytkownik')
        .setDescription('Awansowany użytkownik')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('nowa_ranga')
        .setDescription('Nowa ranga użytkownika')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('degrad')
    .setDescription('Zgłoś degradację użytkownika')
    .addUserOption(option =>
      option.setName('uzytkownik')
        .setDescription('Degradowany użytkownik')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('nowa_ranga')
        .setDescription('Nowa ranga użytkownika')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('kara')
    .setDescription('Wystaw karę dla użytkownika')
    .addUserOption(option =>
      option.setName('uzytkownik')
        .setDescription('Użytkownik, którego kara dotyczy')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('typ')
        .setDescription('Typ kary')
        .setRequired(true)
        .addChoices(
          { name: 'warn', value: 'warn' },
          { name: 'minus', value: 'minus' },
          { name: 'zawieszenie', value: 'zawieszenie' }
        ))
    .addStringOption(option =>
      option.setName('powod')
        .setDescription('Powód kary')
        .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);

(async () => {
  try {
    console.log('Rozpoczynanie odświeżania komend typu slash...');
    await rest.put(
      Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID),
      { body: commands }
    );
    console.log('Komendy zostały pomyślnie zarejestrowane na serwerze.');
  } catch (error) {
    console.error('Błąd podczas rejestracji komend:', error);
  }
})();