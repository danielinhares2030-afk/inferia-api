const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configuração de segurança e CORS (Permite que o Painel e o Site acessem a API)
app.use(cors({
  origin: '*', // Em produção, você pode colocar os links da Vercel do seu site e do admin aqui
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==========================================
// 1. CONEXÃO COM O BANCO DE DADOS (MongoDB)
// ==========================================
// A Vercel vai ler a sua string de conexão das Variáveis de Ambiente (Environment Variables)
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn("⚠️ ALERTA: MONGO_URI não definida nas variáveis de ambiente!");
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('🔥 Conectado ao Abismo (MongoDB) com sucesso!'))
  .catch((err) => console.error('❌ Erro ao conectar no MongoDB:', err));

// ==========================================
// 2. MODELOS REAIS DO BANCO DE DADOS
// ==========================================

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
  paginas: [{ type: String, required: true }], // Array com os links das imagens (Cloudinary)
}, { timestamps: true });

// Índice para otimizar a busca de capítulos por obra
capituloSchema.index({ obraId: 1, numero: -1 });

const Capitulo = mongoose.models.Capitulo || mongoose.model('Capitulo', capituloSchema);

// ==========================================
// 3. ROTAS DA API
// ==========================================

// Rota de Teste para ver se a API está online
app.get('/api', (req, res) => {
  res.status(200).json({ status: 'online', message: 'API Manga Inferia está rodando 100%.' });
});

// --- OBRAS ---

// Buscar todo o catálogo
app.get('/api/obras', async (req, res) => {
  try {
    const obras = await Obra.find().sort({ createdAt: -1 });
    res.status(200).json(obras);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar obras.', detalhes: error.message });
  }
});

// Criar nova obra (Painel Admin)
app.post('/api/obras', async (req, res) => {
  try {
    const novaObra = new Obra(req.body);
    await novaObra.save();
    res.status(201).json(novaObra);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar obra.', detalhes: error.message });
  }
});

// Deletar obra e todos os seus capítulos em cascata (Painel Admin)
app.delete('/api/obras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findById(id);
    
    if (!obra) return res.status(404).json({ error: 'Obra não encontrada.' });

    // Exclusão real e em cascata
    await Capitulo.deleteMany({ obraId: id });
    await Obra.findByIdAndDelete(id);

    res.status(200).json({ message: 'Obra erradicada do abismo com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar obra.', detalhes: error.message });
  }
});

// --- CAPÍTULOS ---

// Buscar capítulos de uma obra específica
app.get('/api/obras/:id/capitulos', async (req, res) => {
  try {
    const capitulos = await Capitulo.find({ obraId: req.params.id }).sort({ numero: -1 });
    res.status(200).json(capitulos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar capítulos.', detalhes: error.message });
  }
});

// Adicionar novo capítulo
app.post('/api/capitulos', async (req, res) => {
  try {
    const novoCapitulo = new Capitulo(req.body);
    await novoCapitulo.save();

    // Atualiza a obra para indicar qual é o último capítulo adicionado
    await Obra.findByIdAndUpdate(req.body.obraId, { cap: `Cap. ${req.body.numero}` });

    res.status(201).json({ message: 'Capítulo forjado!', capitulo: novoCapitulo });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar capítulo.', detalhes: error.message });
  }
});

// --- ESTATÍSTICAS REAIS (DASHBOARD) ---
app.get('/api/estatisticas', async (req, res) => {
  try {
    const totalObras = await Obra.countDocuments();
    const totalCapitulos = await Capitulo.countDocuments();
    
    // Como a contagem de views exige um sistema robusto de tracking no frontend, 
    // os totais de itens do banco são as estatísticas reais entregues aqui.
    res.status(200).json({
      totalObras,
      totalCapitulos,
      status: 'Ativo'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas.', detalhes: error.message });
  }
});

// ==========================================
// 4. EXPORTAÇÃO PARA A VERCEL
// ==========================================
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor de Desenvolvimento rodando na porta ${PORT}`);
  });
}

// Exportar o app é obrigatório para a arquitetura Serverless da Vercel funcionar
module.exports = app;
