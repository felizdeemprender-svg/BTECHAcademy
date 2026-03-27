#!/bin/bash

# 🔄 Script de Recuperación - Sistema de Templates Estable
# Uso: ./recover-stable-templates.sh

echo "🔍 Recuperando Sistema de Templates a Versión Estable..."

# Opción 1: Usar tag (recomendado)
echo "📦 Opción 1: Checkout a tag estable..."
git checkout v-stable-templates-v1

# Opción 2: Usar commit directo (alternativa)
# echo "📦 Opción 2: Checkout a commit específico..."
# git checkout 413762c

echo "✅ Sistema recuperado a versión estable v1"
echo "📋 Funcionalidades confirmadas:"
echo "   • LinkedIn: Genera documents"
echo "   • TikTok: Genera short_videos"  
echo "   • Colores: Usa selección de usuario"
echo "   • Validaciones: Visuales funcionales"
echo "   • Títulos: Dinámicos por colección"

echo ""
echo "🔄 Para volver al trabajo actual:"
echo "   git checkout master"
