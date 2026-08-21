-- 1. Habilitar a extensão de UUID no Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Tarefas (V6, V7 e V8)
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'geral',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')) DEFAULT 'pending',
    estimated_minutes INT DEFAULT 0,
    actual_minutes INT DEFAULT 0,
    due_date DATE,
    due_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    device_id TEXT NOT NULL,
    postpone_count INT DEFAULT 0,
    perceived_difficulty TEXT CHECK (perceived_difficulty IN ('easy', 'normal', 'hard', 'very_hard')),
    parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE
);

-- 3. Tabela de Sessões de Foco (V7)
CREATE TABLE public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INT DEFAULT 0,
    pauses_count INT DEFAULT 0,
    device_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Memória do Assistente (V8)
CREATE TABLE public.assistant_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    category TEXT CHECK (category IN ('preference', 'routine', 'goal', 'habit')) DEFAULT 'preference',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- 5. Ativar Segurança de Linha (RLS) para proteção dos dados
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_memory ENABLE ROW LEVEL SECURITY;

-- 6. Regras para garantir que cada usuário veja APENAS as suas coisas
CREATE POLICY "Usuário acessa apenas suas próprias tarefas" 
ON public.tasks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuário acessa apenas suas próprias sessões de foco" 
ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuário acessa apenas suas próprias memórias" 
ON public.assistant_memory FOR ALL USING (auth.uid() = user_id);