module.exports = (client) => {
  client.once('ready', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
  });
};
