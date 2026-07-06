const governorates = [
  { id: 'alexandria', name: 'Alexandria' },
  { id: 'aswan', name: 'Aswan' },
  { id: 'asyut', name: 'Asyut' },
  { id: 'beheira', name: 'Beheira' },
  { id: 'beni_suef', name: 'Beni Suef' },
  { id: 'cairo', name: 'Cairo' },
  { id: 'dakahlia', name: 'Dakahlia' },
  { id: 'damietta', name: 'Damietta' },
  { id: 'fayoum', name: 'Fayoum' },
  { id: 'gharbia', name: 'Gharbia' },
  { id: 'giza', name: 'Giza' },
  { id: 'ismailia', name: 'Ismailia' },
  { id: 'kafr_sheikh', name: 'Kafr El Sheikh' },
  { id: 'luxor', name: 'Luxor' },
  { id: 'matrouh', name: 'Matrouh' },
  { id: 'minya', name: 'Minya' },
  { id: 'monufia', name: 'Monufia' },
  { id: 'new_valley', name: 'New Valley' },
  { id: 'north_sinai', name: 'North Sinai' },
  { id: 'port_said', name: 'Port Said' },
  { id: 'qalyubia', name: 'Qalyubia' },
  { id: 'qena', name: 'Qena' },
  { id: 'red_sea', name: 'Red Sea' },
  { id: 'sharqia', name: 'Sharqia' },
  { id: 'sohag', name: 'Sohag' },
  { id: 'south_sinai', name: 'South Sinai' },
  { id: 'suez', name: 'Suez' },
];

const citiesByGovernorate = {
  alexandria: [
    { id: 'alex_center', name: 'Alexandria Center' },
    { id: 'alex_raml', name: 'Raml' },
    { id: 'alex_ameriya', name: 'Ameriya' },
    { id: 'alex_agamy', name: 'Agamy' },
    { id: 'borg_arab', name: 'Borg El Arab' },
  ],
  aswan: [
    { id: 'aswan_city', name: 'Aswan City' },
    { id: 'edfu', name: 'Edfu' },
    { id: 'kom_ombo', name: 'Kom Ombo' },
    { id: 'nasr_nuba', name: 'Nasr El Nuba' },
  ],
  asyut: [
    { id: 'asyut_city', name: 'Asyut City' },
    { id: 'abnub', name: 'Abnub' },
    { id: 'abuteeg', name: 'Abuteeg' },
    { id: 'dairut', name: 'Dairut' },
    { id: 'manfalut', name: 'Manfalut' },
  ],
  beheira: [
    { id: 'damanhur', name: 'Damanhur' },
    { id: 'kafr_dawar', name: 'Kafr El Dawar' },
    { id: 'rashid', name: 'Rashid' },
    { id: 'edko', name: 'Edko' },
    { id: 'abu_mas', name: 'Abu El Mas' },
  ],
  beni_suef: [
    { id: 'beni_suef_city', name: 'Beni Suef City' },
    { id: 'el_fashn', name: 'El Fashn' },
    { id: 'el_wasta', name: 'El Wasta' },
    { id: 'nasser', name: 'Nasser' },
  ],
  cairo: [
    { id: 'new_cairo', name: 'New Cairo' },
    { id: 'nasr_city', name: 'Nasr City' },
    { id: 'maadi', name: 'Maadi' },
    { id: 'zamalek', name: 'Zamalek' },
    { id: 'downtown', name: 'Downtown' },
    { id: 'helwan', name: 'Helwan' },
    { id: 'shorouk', name: 'Shorouk' },
    { id: 'rehab', name: 'Rehab' },
    { id: 'sheraton', name: 'Sheraton' },
    { id: 'abbassia', name: 'Abbassia' },
    { id: 'shubra', name: 'Shubra' },
    { id: 'rod_elfarag', name: 'Rod Elfarag' },
    { id: 'sakakini', name: 'Sakakini' },
    { id: 'zeitoun', name: 'Zeitoun' },
    { id: 'mataria', name: 'Mataria' },
    { id: 'hadayeq_helwan', name: 'Hadayeq Helwan' },
    { id: 'maadi_sadat', name: 'Maadi Sadat' },
    { id: 'degla', name: 'Degla' },
  ],
  dakahlia: [
    { id: 'mansoura', name: 'Mansoura' },
    { id: 'mit_ghamr', name: 'Mit Ghamr' },
    { id: 'dikirnis', name: 'Dikirnis' },
    { id: 'belqas', name: 'Belqas' },
    { id: 'sherbin', name: 'Sherbin' },
  ],
  damietta: [
    { id: 'damietta_city', name: 'Damietta City' },
    { id: 'new_damietta', name: 'New Damietta' },
    { id: 'faraskur', name: 'Faraskur' },
    { id: 'kafr_saad', name: 'Kafr Saad' },
  ],
  fayoum: [
    { id: 'fayoum_city', name: 'Fayoum City' },
    { id: 'sinnuris', name: 'Sinnuris' },
    { id: 'tamiya', name: 'Tamiya' },
    { id: 'ibshaway', name: 'Ibshaway' },
    { id: 'itsa', name: 'Itsa' },
  ],
  gharbia: [
    { id: 'tanta', name: 'Tanta' },
    { id: 'elmahalla', name: 'El Mahalla' },
    { id: 'kafr_zayat', name: 'Kafr El Zayat' },
    { id: 'samanoud', name: 'Samanoud' },
    { id: 'zefta', name: 'Zefta' },
  ],
  giza: [
    { id: 'giza_city', name: 'Giza City' },
    { id: 'dokki', name: 'Dokki' },
    { id: 'mohandeseen', name: 'Mohandeseen' },
    { id: 'agouza', name: 'Agouza' },
    { id: 'haram', name: 'Haram' },
    { id: 'faisal', name: 'Faisal' },
    { id: 'imbaba', name: 'Imbaba' },
    { id: 'bulaq_dakrur', name: 'Bulaq El Dakrur' },
    { id: 'shikh_zayed', name: 'Sheikh Zayed' },
    { id: 'october', name: '6th October' },
    { id: 'hawamdya', name: 'Hawamdya' },
    { id: 'badrasheen', name: 'Badrasheen' },
    { id: 'atfeh', name: 'Atfeh' },
  ],
  ismailia: [
    { id: 'ismailia_city', name: 'Ismailia City' },
    { id: 'fayid', name: 'Fayid' },
    { id: 'tal_elkebir', name: 'Tal El Kebir' },
    { id: 'qantara', name: 'Qantara' },
  ],
  kafr_sheikh: [
    { id: 'kafr_sheikh_city', name: 'Kafr El Sheikh City' },
    { id: 'desouk', name: 'Desouk' },
    { id: 'biala', name: 'Biala' },
    { id: 'metoubas', name: 'Metoubas' },
    { id: 'sidi_salem', name: 'Sidi Salem' },
  ],
  luxor: [
    { id: 'luxor_city', name: 'Luxor City' },
    { id: 'karnak', name: 'Karnak' },
    { id: 'armant', name: 'Armant' },
    { id: 'esna', name: 'Esna' },
  ],
  matrouh: [
    { id: 'marsa_matrouh', name: 'Marsa Matrouh' },
    { id: 'siwa', name: 'Siwa' },
    { id: 'el_alamein', name: 'El Alamein' },
    { id: 'el_dabaa', name: 'El Dabaa' },
  ],
  minya: [
    { id: 'minya_city', name: 'Minya City' },
    { id: 'malawi', name: 'Malawi' },
    { id: 'samalut', name: 'Samalut' },
    { id: 'abu_quirqas', name: 'Abu Qurqas' },
    { id: 'maghagha', name: 'Maghagha' },
    { id: 'beni_mazar', name: 'Beni Mazar' },
  ],
  monufia: [
    { id: 'shibin_kom', name: 'Shibin El Kom' },
    { id: 'menouf', name: 'Menouf' },
    { id: 'as_sadat', name: 'Sadat City' },
    { id: 'bagour', name: 'Bagour' },
    { id: 'quwaisna', name: 'Quwaisna' },
  ],
  new_valley: [
    { id: 'kharga', name: 'Kharga' },
    { id: 'dakhla', name: 'Dakhla' },
    { id: 'farafra', name: 'Farafra' },
    { id: 'baris', name: 'Baris' },
  ],
  north_sinai: [
    { id: 'arish', name: 'Arish' },
    { id: 'sheikh_zuid', name: 'Sheikh Zuweid' },
    { id: 'rafah', name: 'Rafah' },
    { id: 'bir_abd', name: 'Bir El Abd' },
  ],
  port_said: [
    { id: 'port_said_city', name: 'Port Said City' },
    { id: 'port_fuad', name: 'Port Fuad' },
    { id: 'sharq', name: 'Sharq' },
  ],
  qalyubia: [
    { id: 'banha', name: 'Benha' },
    { id: 'qalyub', name: 'Qalyub' },
    { id: 'shubra_kheima', name: 'Shubra El Kheima' },
    { id: 'khanka', name: 'Khanka' },
    { id: 'qaha', name: 'Qaha' },
    { id: 'toukh', name: 'Toukh' },
  ],
  qena: [
    { id: 'qena_city', name: 'Qena City' },
    { id: 'naqada', name: 'Naqada' },
    { id: 'qus', name: 'Qus' },
    { id: 'farshout', name: 'Farshout' },
    { id: 'dashna', name: 'Dashna' },
  ],
  red_sea: [
    { id: 'hurghada', name: 'Hurghada' },
    { id: 'safaga', name: 'Safaga' },
    { id: 'qusir', name: 'El Qusir' },
    { id: 'marsa_alam', name: 'Marsa Alam' },
    { id: 'shalatin', name: 'Shalatin' },
  ],
  sharqia: [
    { id: 'zagazig', name: 'Zagazig' },
    { id: 'bilbeis', name: 'Bilbeis' },
    { id: 'abu_kabir', name: 'Abu Kabir' },
    { id: 'hehya', name: 'Hehya' },
    { id: 'kafr_saqr', name: 'Kafr Saqr' },
    { id: 'awlad_saqr', name: 'Awlad Saqr' },
    { id: 'minya_ganah', name: 'Minya El Gannah' },
  ],
  sohag: [
    { id: 'sohag_city', name: 'Sohag City' },
    { id: 'akhmeem', name: 'Akhmeem' },
    { id: 'gerga', name: 'Gerga' },
    { id: 'tahta', name: 'Tahta' },
    { id: 'tima', name: 'Tima' },
    { id: 'sakulta', name: 'Sakulta' },
  ],
  south_sinai: [
    { id: 'sharm', name: 'Sharm El Sheikh' },
    { id: 'dahab', name: 'Dahab' },
    { id: 'tiran', name: 'Tiran' },
    { id: 'ras_sudr', name: 'Ras Sudr' },
    { id: 'abu_redis', name: 'Abu Redis' },
  ],
  suez: [
    { id: 'suez_city', name: 'Suez City' },
    { id: 'arbaeen', name: 'Arbaeen' },
    { id: 'ganayen', name: 'Ganayen' },
    { id: 'ataqah', name: 'Ataqah' },
  ],
};

const districtsByCity = {
  new_cairo: [
    'Fifth Settlement', 'First Settlement', 'El Rehab City',
    'Madinaty', 'Tagamoa El Khames', 'El Banafseg',
    'Ard El Golf', 'El Yasmin', 'El Leloty',
  ],
  nasr_city: [
    'Nasr City East', 'Nasr City West', 'Nasr City Center',
    'El Tayaran', 'Abbas El Akkad', 'Mostafa El Nahas',
    'El Hegaz', 'El Nozha',
  ],
  maadi: [
    'Degla', 'Maadi Sadat', 'Maadi El Khabiri',
    'Sarayat', 'Maadi Center',
  ],
  zamalek: [
    'Zamalek Island', 'Zamalek Center', 'Boulak',
  ],
  downtown: [
    'Tahrir Square', 'Abdeen', 'Midan Ramsis',
    'Wust El Balad', 'Opera Square',
  ],
  helwan: [
    'Helwan East', 'Helwan West', 'Hadayek Helwan',
    'Ezbet El Walda', 'Maasara',
  ],
  shorouk: [
    'Shorouk Center', 'Shorouk Extension', 'Oula',
  ],
  mohandeseen: [
    'Mohandeseen Center', 'Sphinx Square', 'Shehab Street',
    'Lebanon Square', 'Gamiat El Dowal',
  ],
  dokki: [
    'Dokki Center', 'Midan El Missaha', 'Abou El Feda',
    'Mansour Mohammed',
  ],
  haram: [
    'Haram Center', 'Pyramids Plateau', 'Mariouteya',
    'King Mariouteya',
  ],
  agouza: [
    'Agouza Center', 'Boulak El Dakrur', 'Midan El Kit Kat',
  ],
  '6th_october' : [
    'El Hosary', 'Dreamland', 'October City Center',
    'First District', 'Second District', 'Third District',
    'Fourth District', 'Fifth District', 'Sixth District',
    'Seventh District', 'Eighth District', 'Ninth District',
    'Tenth District', 'Eleventh District',
  ],
  sheikh_zayed : [
    'Zayed 2000', 'Zayed Center', 'First Neighborhood',
    'Second Neighborhood', 'Third Neighborhood', 'Fourth Neighborhood',
    'Fifth Neighborhood', 'Sixth Neighborhood', 'Seventh Neighborhood',
    'Eighth Neighborhood', 'Ninth Neighborhood', 'Tenth Neighborhood',
    'Eleventh Neighborhood', 'Twelfth Neighborhood',
  ],
  alex_center: [
    'Midan Saad Zaghloul', 'Raml Station', 'Midan El Shohada',
    'Midan Orabi', 'Sidi Gaber',
  ],
  mansoura: [
    'Mansoura Center', 'Talkha', 'Mansoura University',
    'Toriel', 'Mansoura Hospital',
  ],
  tanta: [
    'Tanta Center', 'Said', 'Midan El Mahatta',
    'Tanta University', 'Sidi Abdallah',
  ],
  hurghada: [
    'Hurghada Center', 'Sakala', 'Dahar',
    'Makadi Bay', 'Soma Bay', 'Sahl Hasheesh',
    'El Gouna',
  ],
  sharm: [
    'Naama Bay', 'Sharm El Maya', 'Ras Nasrani',
    'Hadaba', 'Qesm Sharm',
  ],
  zagazig: [
    'Zagazig Center', 'Midan Ahmed Orabi', 'Zagazig University',
    'Manshiet Abaza',
  ],
};

const getCitiesByGovernorateId = (governorateId) => {
  return citiesByGovernorate[governorateId] || [];
};

const getDistrictsByCityId = (cityId) => {
  return districtsByCity[cityId] || [];
};

const getGovernorateById = (governorateId) => {
  return governorates.find(g => g.id === governorateId) || null;
};

const getCityById = (governorateId, cityId) => {
  const cities = citiesByGovernorate[governorateId] || [];
  return cities.find(c => c.id === cityId) || null;
};

module.exports = {
  governorates,
  citiesByGovernorate,
  districtsByCity,
  getCitiesByGovernorateId,
  getDistrictsByCityId,
  getGovernorateById,
  getCityById,
};
