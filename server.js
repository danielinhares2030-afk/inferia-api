const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 1. CONEXÃO COM O BANCO DE DADOS
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn("⚠️ ALERTA: MONGO_URI não definida nas variáveis de ambiente!");
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('🔥 Conectado ao Abismo (MongoDB) com sucesso!'))
  .catch((err) => console.error('❌ Erro ao conectar no MongoDB:', err));

// 2. MODELOS REAIS DO BANCO DE DADOS
const obraSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String, default: 'Sem descrição disponível.' },
  tipo: { type: String, required: true },
  generos: [{ type: String }],
  status: { type: String, default: 'Lançamento' },
  cap: { type: String, default: 'Cap. 01' },
  rating: { type: String, default: '0.0' },
  capaUrl: { type: String, required: true },
  isCarousel: { type: Boolean, default: false },
  isDestaque: { type: Boolean, default: false },
  isRecente: { type: Boolean, default: true },
  isAtualizado: { type: Boolean, default: false }
}, { timestamps: true });

const Obra = mongoose.models.Obra || mongoose.model('Obra', obraSchema);

const capituloSchema = new mongoose.Schema({
  obraId: { type: mongoose.Schema.Types.ObjectId, ref: 'Obra', required: true },
  numero: { type: Number, required: true },
  titulo: { type: String, default: '' },
  volume: { type: String, default: '' },
  arquivoUrl: { type: String, required: true }, // <-- ATUALIZADO: Agora recebe o link do ZIP
}, { timestamps: true });

capituloSchema.index({ obraId: 1, numero: -1 });

const Capitulo = mongoose.models.Capitulo || mongoose.model('Capitulo', capituloSchema);

// 3. ROTAS DA API
app.get('/api', (req, res) => {
  res.status(200).json({ status: 'online', message: 'API Manga Inferia está rodando 100% com suporte a arquivos ZIP.' });
});

app.get('/api/obras', async (req, res) => {
  try {
    const obras = await Obra.find().sort({ createdAt: -1 });
    res.status(200).json(obras);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar obras.', detalhes: error.message });
  }
});

app.post('/api/obras', async (req, res) => {
  try {
    const novaObra = new Obra(req.body);
    await novaObra.save();
    res.status(201).json(novaObra);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar obra.', detalhes: error.message });
  }
});

app.delete('/api/obras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findById(id);
    if (!obra) return res.status(404).json({ error: 'Obra não encontrada.' });

    await Capitulo.deleteMany({ obraId: id });
    await Obra.findByIdAndDelete(id);

    res.status(200).json({ message: 'Obra erradicada do abismo com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar obra.', detalhes: error.message });
  }
});

app.get('/api/obras/:id/capitulos', async (req, res) => {
  try {
    const capitulos = await Capitulo.find({ obraId: req.params.id }).sort({ numero: -1 });
    res.status(200).json(capitulos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar capítulos.', detalhes: error.message });
  }
});

app.post('/api/capitulos', async (req, res) => {
  try {
    const novoCapitulo = new Capitulo(req.body);
    await novoCapitulo.save();

    await Obra.findByIdAndUpdate(req.body.obraId, { cap: `Cap. ${req.body.numero}` });

    res.status(201).json({ message: 'Capítulo forjado em ZIP!', capitulo: novoCapitulo });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar capítulo.', detalhes: error.message });
  }
});

app.get('/api/estatisticas', async (req, res) => {
  try {
    const totalObras = await Obra.countDocuments();
    const totalCapitulos = await Capitulo.countDocuments();
    res.status(200).json({ totalObras, totalCapitulos, status: 'Ativo' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas.', detalhes: error.message });
  }
});

// 4. EXPORTAÇÃO PARA A VERCEL
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}
module.exports = app;
